use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DocumentStatus {
    Indexed,
    Pending,
    Failed,
    Quarantined,
    Deprecated,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionBlock {
    pub id: String,
    pub heading: String,
    pub level: u8,
    pub content: String,
    pub content_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSnippet {
    pub language: String,
    pub code: String,
    pub description: Option<String>,
    pub line_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct APISymbol {
    pub name: String,
    pub symbol_type: String, // function, class, interface, enum, struct
    pub signature: String,
    pub description: Option<String>,
    pub is_deprecated: bool,
    pub deprecation_notice: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanonicalDocument {
    pub id: Uuid,
    pub source_id: Uuid,
    pub canonical_url: String,
    pub normalized_path: String,
    pub title: String,
    pub sections: Vec<SectionBlock>,
    pub code_snippets: Vec<CodeSnippet>,
    pub api_symbols: Vec<APISymbol>,
    pub content_hash: String,
    pub status: DocumentStatus,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceInfo {
    pub id: Uuid,
    pub name: String,
    pub root_url: String,
    pub canonical_domain: String,
    pub category: String,
    pub documentation_type: String,
    pub version: Option<String>,
    pub active_snapshot_id: Option<Uuid>,
    pub last_synced_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotManifest {
    pub snapshot_id: Uuid,
    pub source_id: Uuid,
    pub version_number: u32,
    pub snapshot_hash: String,
    pub page_count: usize,
    pub document_hashes: Vec<DocumentHashEntry>,
    pub published_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentHashEntry {
    pub document_id: Uuid,
    pub canonical_url: String,
    pub path: String,
    pub content_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub document_id: Uuid,
    pub source_id: Uuid,
    pub title: String,
    pub canonical_url: String,
    pub section_heading: Option<String>,
    pub snippet: String,
    pub score: f32,
    pub version: Option<String>,
}
