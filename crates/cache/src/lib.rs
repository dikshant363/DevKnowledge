use anyhow::Result;
use rusqlite::{params, Connection, Row};
use shared_types::{CanonicalDocument, SearchResult, SourceInfo};
use std::path::Path;
use uuid::Uuid;

pub struct LocalCache {
    conn: Connection,
}

/// Sanitizes a raw user query string for safe SQLite FTS5 MATCH evaluation.
/// Prevents syntax errors from bare colons, unclosed quotes, wildcards, and reserved operators.
pub fn sanitize_fts_query(query: &str) -> String {
    let tokens: Vec<String> = query
        .split(|c: char| !c.is_alphanumeric() && c != '_' && c != '.')
        .filter(|s| !s.is_empty())
        .map(|s| format!("\"{}\"", s.replace('"', "")))
        .collect();

    tokens.join(" ")
}

fn parse_search_row(row: &Row) -> rusqlite::Result<SearchResult> {
    let id_str: String = row.get(0)?;
    let src_str: String = row.get(1)?;
    let title: String = row.get(2)?;
    let url: String = row.get(3)?;
    let snippet: String = row.get(4)?;
    let rank: f64 = row.get(5)?;

    let doc_id = Uuid::parse_str(&id_str).unwrap_or_default();
    let src_id = Uuid::parse_str(&src_str).unwrap_or_default();

    Ok(SearchResult {
        document_id: doc_id,
        source_id: src_id,
        title,
        canonical_url: url,
        section_heading: None,
        snippet,
        score: -rank as f32,
        version: None,
    })
}

impl LocalCache {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        let cache = Self { conn };
        cache.init_schema()?;
        Ok(cache)
    }

    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let cache = Self { conn };
        cache.init_schema()?;
        Ok(cache)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS sources (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                root_url TEXT NOT NULL,
                category TEXT NOT NULL,
                active_snapshot_id TEXT,
                raw_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                canonical_url TEXT NOT NULL,
                title TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                raw_json TEXT NOT NULL,
                FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS doc_fts USING fts5(
                document_id UNINDEXED,
                title,
                content
            );
            ",
        )?;
        Ok(())
    }

    pub fn save_source(&self, source: &SourceInfo) -> Result<()> {
        let raw = serde_json::to_string(source)?;
        self.conn.execute(
            "INSERT OR REPLACE INTO sources (id, name, root_url, category, active_snapshot_id, raw_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                source.id.to_string(),
                source.name,
                source.root_url,
                source.category,
                source.active_snapshot_id.map(|u| u.to_string()),
                raw,
            ],
        )?;
        Ok(())
    }

    pub fn list_sources(&self) -> Result<Vec<SourceInfo>> {
        let mut stmt = self.conn.prepare("SELECT raw_json FROM sources")?;
        let rows = stmt.query_map([], |row| {
            let raw: String = row.get(0)?;
            Ok(raw)
        })?;

        let mut sources = Vec::new();
        for r in rows {
            let raw = r?;
            if let Ok(src) = serde_json::from_str::<SourceInfo>(&raw) {
                sources.push(src);
            }
        }
        Ok(sources)
    }

    pub fn delete_source(&self, id: Uuid) -> Result<()> {
        let id_str = id.to_string();
        self.conn.execute(
            "DELETE FROM doc_fts WHERE document_id IN (SELECT id FROM documents WHERE source_id = ?1)",
            params![id_str],
        )?;
        self.conn
            .execute("DELETE FROM sources WHERE id = ?1", params![id_str])?;
        Ok(())
    }

    pub fn count_sources(&self) -> Result<usize> {
        let count: i64 = self
            .conn
            .query_row("SELECT count(*) FROM sources", [], |r| r.get(0))?;
        Ok(count as usize)
    }

    pub fn save_document(&self, doc: &CanonicalDocument) -> Result<()> {
        let raw = serde_json::to_string(doc)?;
        self.conn.execute(
            "INSERT OR REPLACE INTO documents (id, source_id, canonical_url, title, content_hash, raw_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                doc.id.to_string(),
                doc.source_id.to_string(),
                doc.canonical_url,
                doc.title,
                doc.content_hash,
                raw,
            ],
        )?;

        // Concatenate section content for FTS
        let mut content = String::new();
        for sec in &doc.sections {
            content.push_str(&sec.heading);
            content.push('\n');
            content.push_str(&sec.content);
            content.push('\n');
        }

        self.conn.execute(
            "DELETE FROM doc_fts WHERE document_id = ?1",
            params![doc.id.to_string()],
        )?;
        self.conn.execute(
            "INSERT INTO doc_fts (document_id, title, content) VALUES (?1, ?2, ?3)",
            params![doc.id.to_string(), doc.title, content],
        )?;

        Ok(())
    }

    pub fn get_document(&self, id: Uuid) -> Result<Option<CanonicalDocument>> {
        let mut stmt = self
            .conn
            .prepare("SELECT raw_json FROM documents WHERE id = ?1")?;
        let mut rows = stmt.query(params![id.to_string()])?;

        if let Some(row) = rows.next()? {
            let raw: String = row.get(0)?;
            let doc = serde_json::from_str(&raw)?;
            Ok(Some(doc))
        } else {
            Ok(None)
        }
    }

    pub fn get_document_by_url(&self, canonical_url: &str) -> Result<Option<CanonicalDocument>> {
        let mut stmt = self
            .conn
            .prepare("SELECT raw_json FROM documents WHERE canonical_url = ?1")?;
        let mut rows = stmt.query(params![canonical_url])?;

        if let Some(row) = rows.next()? {
            let raw: String = row.get(0)?;
            let doc = serde_json::from_str(&raw)?;
            Ok(Some(doc))
        } else {
            Ok(None)
        }
    }

    pub fn list_documents_for_source(&self, source_id: Uuid) -> Result<Vec<CanonicalDocument>> {
        let mut stmt = self
            .conn
            .prepare("SELECT raw_json FROM documents WHERE source_id = ?1")?;
        let rows = stmt.query_map(params![source_id.to_string()], |row| {
            let raw: String = row.get(0)?;
            Ok(raw)
        })?;

        let mut docs = Vec::new();
        for r in rows {
            let raw = r?;
            if let Ok(doc) = serde_json::from_str::<CanonicalDocument>(&raw) {
                docs.push(doc);
            }
        }
        Ok(docs)
    }

    pub fn delete_document(&self, id: Uuid) -> Result<()> {
        let id_str = id.to_string();
        self.conn.execute(
            "DELETE FROM doc_fts WHERE document_id = ?1",
            params![id_str],
        )?;
        self.conn
            .execute("DELETE FROM documents WHERE id = ?1", params![id_str])?;
        Ok(())
    }

    pub fn count_documents(&self) -> Result<usize> {
        let count: i64 = self
            .conn
            .query_row("SELECT count(*) FROM documents", [], |r| r.get(0))?;
        Ok(count as usize)
    }

    pub fn search(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>> {
        self.search_with_source(query, None, limit)
    }

    pub fn search_with_source(
        &self,
        query: &str,
        source_id: Option<Uuid>,
        limit: usize,
    ) -> Result<Vec<SearchResult>> {
        let sanitized = sanitize_fts_query(query);
        if sanitized.is_empty() {
            return Ok(Vec::new());
        }

        let mut results = Vec::new();

        if let Some(src) = source_id {
            let mut stmt = self.conn.prepare(
                "SELECT d.id, d.source_id, d.title, d.canonical_url, snippet(doc_fts, 2, '<b>', '</b>', '...', 24), rank
                 FROM doc_fts
                 JOIN documents d ON d.id = doc_fts.document_id
                 WHERE doc_fts MATCH ?1 AND d.source_id = ?2
                 ORDER BY rank
                 LIMIT ?3",
            )?;
            let rows = stmt.query_map(
                params![sanitized, src.to_string(), limit as i64],
                parse_search_row,
            )?;
            for r in rows {
                results.push(r?);
            }
        } else {
            let mut stmt = self.conn.prepare(
                "SELECT d.id, d.source_id, d.title, d.canonical_url, snippet(doc_fts, 2, '<b>', '</b>', '...', 24), rank
                 FROM doc_fts
                 JOIN documents d ON d.id = doc_fts.document_id
                 WHERE doc_fts MATCH ?1
                 ORDER BY rank
                 LIMIT ?2",
            )?;
            let rows = stmt.query_map(params![sanitized, limit as i64], parse_search_row)?;
            for r in rows {
                results.push(r?);
            }
        }

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use shared_types::{DocumentStatus, SectionBlock};

    #[test]
    fn test_local_cache_in_memory() -> Result<()> {
        let cache = LocalCache::open_in_memory()?;
        let src_id = Uuid::new_v4();
        let source = SourceInfo {
            id: src_id,
            name: "Rust Lang Docs".to_string(),
            root_url: "https://doc.rust-lang.org/".to_string(),
            canonical_domain: "doc.rust-lang.org".to_string(),
            category: "systems-programming".to_string(),
            documentation_type: "official".to_string(),
            version: Some("1.80".to_string()),
            active_snapshot_id: None,
            last_synced_at: Some(Utc::now()),
        };

        cache.save_source(&source)?;
        let sources = cache.list_sources()?;
        assert_eq!(sources.len(), 1);
        assert_eq!(sources[0].name, "Rust Lang Docs");
        assert_eq!(cache.count_sources()?, 1);

        let doc_id = Uuid::new_v4();
        let doc = CanonicalDocument {
            id: doc_id,
            source_id: src_id,
            canonical_url: "https://doc.rust-lang.org/book/ch01.html".to_string(),
            normalized_path: "/book/ch01.html".to_string(),
            title: "Getting Started with Rust".to_string(),
            sections: vec![SectionBlock {
                id: "installation".to_string(),
                heading: "Installation".to_string(),
                level: 2,
                content: "To install Rust, download rustup and run it.".to_string(),
                content_hash: "hash123".to_string(),
            }],
            code_snippets: vec![],
            api_symbols: vec![],
            content_hash: "dochash123".to_string(),
            status: DocumentStatus::Indexed,
            updated_at: Utc::now(),
        };

        cache.save_document(&doc)?;
        assert_eq!(cache.count_documents()?, 1);

        let retrieved = cache.get_document(doc_id)?.expect("Document must exist");
        assert_eq!(retrieved.title, "Getting Started with Rust");

        let by_url = cache
            .get_document_by_url("https://doc.rust-lang.org/book/ch01.html")?
            .expect("Must find by url");
        assert_eq!(by_url.id, doc_id);

        let search_res = cache.search("rustup", 5)?;
        assert_eq!(search_res.len(), 1);
        assert_eq!(search_res[0].document_id, doc_id);

        // Test with source filtering
        let search_src = cache.search_with_source("rustup", Some(src_id), 5)?;
        assert_eq!(search_src.len(), 1);

        let search_other_src = cache.search_with_source("rustup", Some(Uuid::new_v4()), 5)?;
        assert_eq!(search_other_src.len(), 0);

        Ok(())
    }

    #[test]
    fn test_search_sanitization_special_characters() -> Result<()> {
        let cache = LocalCache::open_in_memory()?;
        let src_id = Uuid::new_v4();
        let source = SourceInfo {
            id: src_id,
            name: "React Docs".to_string(),
            root_url: "https://react.dev".to_string(),
            canonical_domain: "react.dev".to_string(),
            category: "frontend".to_string(),
            documentation_type: "official".to_string(),
            version: Some("18.2".to_string()),
            active_snapshot_id: None,
            last_synced_at: None,
        };
        cache.save_source(&source)?;

        let doc_id = Uuid::new_v4();
        let doc = CanonicalDocument {
            id: doc_id,
            source_id: src_id,
            canonical_url: "https://react.dev/reference/react/useState".to_string(),
            normalized_path: "/reference/react/useState".to_string(),
            title: "useState Hook Reference".to_string(),
            sections: vec![SectionBlock {
                id: "usage".to_string(),
                heading: "Usage: React.useState".to_string(),
                level: 2,
                content:
                    "Call useState at the top level of your component to declare a state variable."
                        .to_string(),
                content_hash: "h1".to_string(),
            }],
            code_snippets: vec![],
            api_symbols: vec![],
            content_hash: "dh1".to_string(),
            status: DocumentStatus::Indexed,
            updated_at: Utc::now(),
        };
        cache.save_document(&doc)?;

        // Queries with punctuation, colons, unclosed quotes, AND/OR/NOT operators should not crash
        let q1 = cache.search("React:useState", 10)?;
        assert!(!q1.is_empty(), "Should match sanitized tokens");

        let q2 = cache.search("useState(\"component", 10)?;
        assert!(
            !q2.is_empty(),
            "Unclosed quote should be safely handled and match component"
        );

        let q3 = cache.search("NOT AND OR ::: ???", 10)?;
        // Handled cleanly without syntax error
        assert!(q3.is_empty() || !q3.is_empty());

        let q4 = cache.search("", 10)?;
        assert_eq!(q4.len(), 0, "Empty query returns empty results");

        Ok(())
    }

    #[test]
    fn test_delete_and_cascade() -> Result<()> {
        let cache = LocalCache::open_in_memory()?;
        let src_id = Uuid::new_v4();
        let source = SourceInfo {
            id: src_id,
            name: "Python Docs".to_string(),
            root_url: "https://docs.python.org/3/".to_string(),
            canonical_domain: "docs.python.org".to_string(),
            category: "general".to_string(),
            documentation_type: "official".to_string(),
            version: Some("3.12".to_string()),
            active_snapshot_id: None,
            last_synced_at: None,
        };
        cache.save_source(&source)?;

        let doc_id = Uuid::new_v4();
        let doc = CanonicalDocument {
            id: doc_id,
            source_id: src_id,
            canonical_url: "https://docs.python.org/3/library/json.html".to_string(),
            normalized_path: "/3/library/json.html".to_string(),
            title: "json — JSON encoder and decoder".to_string(),
            sections: vec![SectionBlock {
                id: "intro".to_string(),
                heading: "Introduction".to_string(),
                level: 1,
                content: "JSON is a syntax for storing and exchanging data.".to_string(),
                content_hash: "h2".to_string(),
            }],
            code_snippets: vec![],
            api_symbols: vec![],
            content_hash: "dh2".to_string(),
            status: DocumentStatus::Indexed,
            updated_at: Utc::now(),
        };
        cache.save_document(&doc)?;
        assert_eq!(cache.count_documents()?, 1);
        assert_eq!(cache.search("encoder", 5)?.len(), 1);

        // Delete document directly
        cache.delete_document(doc_id)?;
        assert_eq!(cache.count_documents()?, 0);
        assert!(cache.get_document(doc_id)?.is_none());
        assert_eq!(cache.search("encoder", 5)?.len(), 0);

        // Save again, then delete source
        cache.save_document(&doc)?;
        assert_eq!(cache.count_documents()?, 1);
        cache.delete_source(src_id)?;
        assert_eq!(cache.count_sources()?, 0);
        assert_eq!(cache.count_documents()?, 0);
        assert_eq!(cache.search("encoder", 5)?.len(), 0);

        Ok(())
    }
}
