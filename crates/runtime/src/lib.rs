use anyhow::Result;
use cache::LocalCache;
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LocalConfig {
    pub server_url: String,
    pub api_token: Option<String>,
}

pub struct RuntimeEnvironment {
    pub base_dir: PathBuf,
    pub config_dir: PathBuf,
    pub database_path: PathBuf,
    pub cache_dir: PathBuf,
    pub config_path: PathBuf,
}

impl RuntimeEnvironment {
    pub fn default_paths() -> Result<Self> {
        let base_dir =
            if let Some(proj_dirs) = ProjectDirs::from("com", "devknowledge", "DevKnowledge") {
                proj_dirs.data_dir().to_path_buf()
            } else {
                let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE"))?;
                PathBuf::from(home).join(".devknowledge")
            };

        let config_dir = base_dir.join("config");
        let database_dir = base_dir.join("database");
        let cache_dir = base_dir.join("cache");

        fs::create_dir_all(&config_dir)?;
        fs::create_dir_all(&database_dir)?;
        fs::create_dir_all(&cache_dir)?;

        let database_path = database_dir.join("knowledge.db");
        let config_path = config_dir.join("config.json");

        Ok(Self {
            base_dir,
            config_dir,
            database_path,
            cache_dir,
            config_path,
        })
    }

    pub fn open_cache(&self) -> Result<LocalCache> {
        LocalCache::open(&self.database_path)
    }

    pub fn save_config(&self, config: &LocalConfig) -> Result<()> {
        let json = serde_json::to_string_pretty(config)?;
        fs::write(&self.config_path, json)?;
        Ok(())
    }

    pub fn load_config(&self) -> LocalConfig {
        if let Ok(content) = fs::read_to_string(&self.config_path) {
            if let Ok(cfg) = serde_json::from_str::<LocalConfig>(&content) {
                return cfg;
            }
        }
        LocalConfig {
            server_url: "http://localhost:8000".to_string(),
            api_token: None,
        }
    }

    pub fn clear_credentials(&self) -> Result<()> {
        if self.config_path.exists() {
            fs::remove_file(&self.config_path)?;
        }
        Ok(())
    }
}
