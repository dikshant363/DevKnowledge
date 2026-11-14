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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SectionBlock {
    pub id: String,
    pub heading: String,
    pub level: u8,
    pub content: String,
    pub content_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CodeSnippet {
    pub language: String,
    pub code: String,
    pub description: Option<String>,
    pub line_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct APISymbol {
    pub name: String,
    pub symbol_type: String, // function, class, interface, enum, struct
    pub signature: String,
    pub description: Option<String>,
    pub is_deprecated: bool,
    pub deprecation_notice: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SnapshotManifest {
    pub snapshot_id: Uuid,
    pub source_id: Uuid,
    pub version_number: u32,
    pub snapshot_hash: String,
    pub page_count: usize,
    pub document_hashes: Vec<DocumentHashEntry>,
    pub published_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DocumentHashEntry {
    pub document_id: Uuid,
    pub canonical_url: String,
    pub path: String,
    pub content_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectDependency {
    pub ecosystem: String,
    pub package_name: String,
    pub version_constraint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct ProjectProfile {
    pub name: String,
    #[serde(default)]
    pub dependencies: Vec<ProjectDependency>,
    #[serde(default)]
    pub attached_sources: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_project_profile_serde() {
        let profile = ProjectProfile {
            name: "Test Project".to_string(),
            dependencies: vec![
                ProjectDependency {
                    ecosystem: "cargo".to_string(),
                    package_name: "tokio".to_string(),
                    version_constraint: "1.38".to_string(),
                },
                ProjectDependency {
                    ecosystem: "npm".to_string(),
                    package_name: "react".to_string(),
                    version_constraint: "^18.2.0".to_string(),
                },
            ],
            attached_sources: vec!["rust-std".to_string(), "react-docs".to_string()],
        };

        let json = serde_json::to_string(&profile).expect("Must serialize");
        let deserialized: ProjectProfile = serde_json::from_str(&json).expect("Must deserialize");
        assert_eq!(deserialized, profile);
    }

    #[test]
    fn test_canonical_document_serde() {
        let doc = CanonicalDocument {
            id: Uuid::new_v4(),
            source_id: Uuid::new_v4(),
            canonical_url: "https://example.com/docs".to_string(),
            normalized_path: "/docs".to_string(),
            title: "Example Doc".to_string(),
            sections: vec![SectionBlock {
                id: "sec1".to_string(),
                heading: "Heading 1".to_string(),
                level: 1,
                content: "Content".to_string(),
                content_hash: "hash".to_string(),
            }],
            code_snippets: vec![CodeSnippet {
                language: "rust".to_string(),
                code: "fn main() {}".to_string(),
                description: Some("main function".to_string()),
                line_count: 1,
            }],
            api_symbols: vec![APISymbol {
                name: "main".to_string(),
                symbol_type: "function".to_string(),
                signature: "fn main()".to_string(),
                description: None,
                is_deprecated: false,
                deprecation_notice: None,
            }],
            content_hash: "content_hash".to_string(),
            status: DocumentStatus::Indexed,
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&doc).expect("Must serialize");
        let deserialized: CanonicalDocument =
            serde_json::from_str(&json).expect("Must deserialize");
        assert_eq!(deserialized.title, doc.title);
        assert_eq!(deserialized.sections.len(), 1);
        assert_eq!(deserialized.code_snippets.len(), 1);
        assert_eq!(deserialized.api_symbols.len(), 1);
    }
}
