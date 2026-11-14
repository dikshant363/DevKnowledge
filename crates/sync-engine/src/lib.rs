use anyhow::Result;
use cache::LocalCache;
use knowledge_client::KnowledgeClient;
use shared_types::SourceInfo;
use tracing::info;
use uuid::Uuid;

pub struct SyncSummary {
    pub source_id: Uuid,
    pub documents_downloaded: usize,
    pub documents_skipped: usize,
    pub is_up_to_date: bool,
}

pub struct SyncEngine<'a> {
    cache: &'a LocalCache,
    client: &'a KnowledgeClient,
}

impl<'a> SyncEngine<'a> {
    pub fn new(cache: &'a LocalCache, client: &'a KnowledgeClient) -> Self {
        Self { cache, client }
    }

    pub async fn sync_source(&self, source: &SourceInfo) -> Result<SyncSummary> {
        info!("Syncing source: {} ({})", source.name, source.id);
        self.cache.save_source(source)?;

        let manifest = self.client.get_manifest(source.id).await?;
        let mut downloaded = 0;
        let mut skipped = 0;

        for entry in &manifest.document_hashes {
            let existing = self.cache.get_document(entry.document_id)?;
            let needs_update = match existing {
                Some(doc) => doc.content_hash != entry.content_hash,
                None => true,
            };

            if needs_update {
                let doc = self.client.get_document(entry.document_id).await?;
                self.cache.save_document(&doc)?;
                downloaded += 1;
            } else {
                skipped += 1;
            }
        }

        Ok(SyncSummary {
            source_id: source.id,
            documents_downloaded: downloaded,
            documents_skipped: skipped,
            is_up_to_date: downloaded == 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_summary_up_to_date() {
        let summary = SyncSummary {
            source_id: Uuid::new_v4(),
            documents_downloaded: 0,
            documents_skipped: 15,
            is_up_to_date: true,
        };
        assert!(summary.is_up_to_date);
        assert_eq!(summary.documents_downloaded, 0);
        assert_eq!(summary.documents_skipped, 15);
    }
}
