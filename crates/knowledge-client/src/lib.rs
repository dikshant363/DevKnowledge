use anyhow::Result;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use reqwest::Client;
use shared_types::{CanonicalDocument, SearchResult, SnapshotManifest, SourceInfo};
use uuid::Uuid;

pub struct KnowledgeClient {
    client: Client,
    base_url: String,
}

impl KnowledgeClient {
    pub fn new(base_url: String, api_key: Option<String>) -> Result<Self> {
        let mut headers = HeaderMap::new();
        if let Some(key) = api_key {
            let mut val = HeaderValue::from_str(&format!("Bearer {}", key))?;
            val.set_sensitive(true);
            headers.insert(AUTHORIZATION, val);
        }

        let client = Client::builder().default_headers(headers).build()?;
        Ok(Self { client, base_url })
    }

    pub async fn list_sources(&self) -> Result<Vec<SourceInfo>> {
        let url = format!("{}/api/v1/sources", self.base_url);
        let resp = self.client.get(&url).send().await?.error_for_status()?;
        let body = resp.json::<serde_json::Value>().await?;
        let items = if let Some(arr) = body.get("items") {
            serde_json::from_value::<Vec<SourceInfo>>(arr.clone())?
        } else {
            serde_json::from_value::<Vec<SourceInfo>>(body)?
        };
        Ok(items)
    }

    pub async fn register_source(
        &self,
        root_url: &str,
        name: Option<&str>,
        category: Option<&str>,
    ) -> Result<SourceInfo> {
        let url = format!("{}/api/v1/sources", self.base_url);
        let mut payload = serde_json::json!({
            "root_url": root_url,
        });
        if let Some(n) = name {
            payload["name"] = serde_json::json!(n);
        }
        if let Some(c) = category {
            payload["category"] = serde_json::json!(c);
        }
        let resp = self.client.post(&url).json(&payload).send().await?.error_for_status()?;
        let source = resp.json::<SourceInfo>().await?;
        Ok(source)
    }

    pub async fn get_manifest(&self, source_id: Uuid) -> Result<SnapshotManifest> {
        let url = format!("{}/api/v1/sources/{}/manifest", self.base_url, source_id);
        let resp = self.client.get(&url).send().await?.error_for_status()?;
        let manifest = resp.json::<SnapshotManifest>().await?;
        Ok(manifest)
    }

    pub async fn get_document(&self, doc_id: Uuid) -> Result<CanonicalDocument> {
        let url = format!("{}/api/v1/documents/{}", self.base_url, doc_id);
        let resp = self.client.get(&url).send().await?.error_for_status()?;
        let doc = resp.json::<CanonicalDocument>().await?;
        Ok(doc)
    }

    pub async fn search(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>> {
        let url = format!("{}/api/v1/search", self.base_url);
        let resp = self
            .client
            .get(&url)
            .query(&[("q", query), ("limit", &limit.to_string())])
            .send()
            .await?
            .error_for_status()?;
        let results = resp.json::<Vec<SearchResult>>().await?;
        Ok(results)
    }
}
