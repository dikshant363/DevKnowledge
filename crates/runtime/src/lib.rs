use anyhow::Result;
use cache::LocalCache;
use directories::ProjectDirs;
use std::fs;
use std::path::PathBuf;

pub struct RuntimeEnvironment {
    pub base_dir: PathBuf,
    pub config_dir: PathBuf,
    pub database_path: PathBuf,
    pub cache_dir: PathBuf,
}

impl RuntimeEnvironment {
    pub fn default_paths() -> Result<Self> {
        let base_dir = if let Some(proj_dirs) = ProjectDirs::from("com", "devknowledge", "DevKnowledge") {
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

        Ok(Self {
            base_dir,
            config_dir,
            database_path,
            cache_dir,
        })
    }

    pub fn open_cache(&self) -> Result<LocalCache> {
        LocalCache::open(&self.database_path)
    }
}
