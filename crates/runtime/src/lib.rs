use anyhow::Result;
use cache::LocalCache;
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use shared_types::ProjectProfile;
use std::fs;
use std::path::{Path, PathBuf};

pub mod manifest;

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
        let base_dir = if let Ok(custom_dir) = std::env::var("DEVKNOWLEDGE_DIR") {
            PathBuf::from(custom_dir)
        } else if let Some(proj_dirs) = ProjectDirs::from("com", "devknowledge", "DevKnowledge") {
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

    pub fn project_profile_path(dir: &Path) -> PathBuf {
        dir.join(".devknowledge").join("project.json")
    }

    pub fn load_project_profile(&self, dir: &Path) -> Result<Option<ProjectProfile>> {
        let p = Self::project_profile_path(dir);
        if !p.exists() {
            return Ok(None);
        }
        let content = fs::read_to_string(p)?;
        let profile = serde_json::from_str::<ProjectProfile>(&content)?;
        Ok(Some(profile))
    }

    pub fn save_project_profile(&self, dir: &Path, profile: &ProjectProfile) -> Result<()> {
        let p = Self::project_profile_path(dir);
        if let Some(parent) = p.parent() {
            fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(profile)?;
        fs::write(p, json)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_runtime_custom_dir() -> Result<()> {
        let temp_dir = std::env::temp_dir().join(format!("dk_test_{}", uuid::Uuid::new_v4()));
        std::env::set_var("DEVKNOWLEDGE_DIR", &temp_dir);

        let env = RuntimeEnvironment::default_paths()?;
        assert_eq!(env.base_dir, temp_dir);
        assert!(env.config_dir.exists());
        assert!(env.database_path.parent().unwrap().exists());

        let cfg = LocalConfig {
            server_url: "http://testserver:9999".to_string(),
            api_token: Some("secret123".to_string()),
        };
        env.save_config(&cfg)?;
        let loaded = env.load_config();
        assert_eq!(loaded.server_url, "http://testserver:9999");
        assert_eq!(loaded.api_token, Some("secret123".to_string()));

        env.clear_credentials()?;
        let after_clear = env.load_config();
        assert_eq!(after_clear.api_token, None);

        // Project profile
        let proj_dir = temp_dir.join("my-project");
        let profile = ProjectProfile {
            name: "My App".to_string(),
            dependencies: vec![],
            attached_sources: vec!["source-1".to_string()],
        };
        env.save_project_profile(&proj_dir, &profile)?;
        let loaded_proj = env.load_project_profile(&proj_dir)?.expect("Should exist");
        assert_eq!(loaded_proj.name, "My App");
        assert_eq!(loaded_proj.attached_sources.len(), 1);

        // Clean up
        let _ = fs::remove_dir_all(&temp_dir);
        std::env::remove_var("DEVKNOWLEDGE_DIR");
        Ok(())
    }
}
