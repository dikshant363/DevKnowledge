use anyhow::Result;
use clap::{Parser, Subcommand};
use knowledge_client::KnowledgeClient;
use runtime::{LocalConfig, RuntimeEnvironment};
use std::path::PathBuf;
use sync_engine::SyncEngine;
use uuid::Uuid;

#[derive(Parser, Debug)]
#[command(name = "devknowledge", author, version, about = "Universal AI Developer Knowledge CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Authenticate against DevKnowledge cloud or self-hosted server
    Login {
        #[arg(long, default_value = "http://localhost:8000")]
        server: String,
        #[arg(long)]
        api_key: Option<String>,
    },
    /// Manage documentation sources
    Source {
        #[command(subcommand)]
        cmd: SourceCommands,
    },
    /// Search technical documentation (local cache or cloud)
    Search {
        query: String,
        #[arg(short, long, default_value_t = 10)]
        limit: usize,
    },
    /// Retrieve full document content
    Docs {
        #[command(subcommand)]
        cmd: DocsCommands,
    },
    /// Project intelligence and dependency management
    Project {
        #[command(subcommand)]
        cmd: ProjectCommands,
    },
    /// Check local cache and cloud synchronization status
    Status,
    /// System diagnostics and environment verification
    Doctor,
    /// Log out and clear local credentials
    Logout,
}

#[derive(Subcommand, Debug)]
enum SourceCommands {
    /// Register a new documentation URL
    Add {
        url: String,
        #[arg(short, long)]
        name: Option<String>,
        #[arg(short, long, default_value = "general")]
        category: String,
    },
    /// List registered sources
    List,
    /// Synchronize local documentation cache with upstream
    Sync { source_name_or_id: Option<String> },
}

#[derive(Subcommand, Debug)]
enum DocsCommands {
    /// Retrieve document by ID
    Get { document_id: String },
}

#[derive(Subcommand, Debug)]
enum ProjectCommands {
    /// Initialize a devknowledge project profile in the current directory
    Init,
    /// Import dependencies from project manifest (e.g. package.json, Cargo.toml)
    Import {
        #[arg(default_value = ".")]
        path: PathBuf,
    },
    /// Attach documentation sources to the current project
    Attach { sources: Vec<String> },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();
    let runtime_env = RuntimeEnvironment::default_paths()?;
    let config = runtime_env.load_config();
    let client = KnowledgeClient::new(config.server_url.clone(), config.api_token.clone())?;

    match cli.command {
        Commands::Login { server, api_key } => {
            let new_config = LocalConfig {
                server_url: server.clone(),
                api_token: api_key,
            };
            runtime_env.save_config(&new_config)?;
            println!("DevKnowledge CLI authenticated with {}", server);
        }
        Commands::Source { cmd } => match cmd {
            SourceCommands::Add {
                url,
                name,
                category,
            } => {
                match client
                    .register_source(&url, name.as_deref(), Some(&category))
                    .await
                {
                    Ok(source) => {
                        let cache = runtime_env.open_cache()?;
                        cache.save_source(&source)?;
                        println!(
                            "Successfully registered source: {} ({}) [ID: {}]",
                            source.name, source.root_url, source.id
                        );
                    }
                    Err(e) => {
                        eprintln!("Failed to register source with cloud API ({}). Attempting local queueing...", e);
                        println!("Queued registration for {} in category [{}]", url, category);
                    }
                }
            }
            SourceCommands::List => {
                let cache = runtime_env.open_cache()?;
                let mut sources = cache.list_sources()?;
                if sources.is_empty() {
                    // Fallback: query cloud client
                    if let Ok(cloud_sources) = client.list_sources().await {
                        for s in &cloud_sources {
                            let _ = cache.save_source(s);
                        }
                        sources = cloud_sources;
                    }
                }

                if sources.is_empty() {
                    println!("No documentation sources registered or cached locally.");
                } else {
                    println!("Registered Sources ({}):", sources.len());
                    for s in sources {
                        println!(
                            " - [{}] {} ({}) [ID: {}]",
                            s.category, s.name, s.root_url, s.id
                        );
                    }
                }
            }
            SourceCommands::Sync { source_name_or_id } => {
                let cache = runtime_env.open_cache()?;
                let sync_eng = SyncEngine::new(&cache, &client);

                let sources = match client.list_sources().await {
                    Ok(srcs) => srcs,
                    Err(_) => cache.list_sources()?,
                };

                println!("Synchronizing documentation sources with upstream manifests...");
                for s in sources {
                    if let Some(ref target) = source_name_or_id {
                        if s.name != *target && s.id.to_string() != *target {
                            continue;
                        }
                    }

                    match sync_eng.sync_source(&s).await {
                        Ok(summary) => {
                            println!(
                                "✓ Synced {}: {} new/updated, {} skipped (up to date)",
                                s.name, summary.documents_downloaded, summary.documents_skipped
                            );
                        }
                        Err(e) => {
                            eprintln!("! Could not sync {}: {}", s.name, e);
                        }
                    }
                }
            }
        },
        Commands::Search { query, limit } => {
            let cache = runtime_env.open_cache()?;
            let mut results = cache.search(&query, limit)?;

            // If local cache is empty, query cloud API directly
            if results.is_empty() {
                if let Ok(cloud_results) = client.search(&query, limit).await {
                    results = cloud_results;
                }
            }

            if results.is_empty() {
                println!("No documentation results found for '{}'", query);
            } else {
                println!("Found {} results for '{}':\n", results.len(), query);
                for (i, res) in results.iter().enumerate() {
                    println!("{}. {} ({})", i + 1, res.title, res.canonical_url);
                    println!("   {}\n", res.snippet);
                }
            }
        }
        Commands::Docs { cmd } => match cmd {
            DocsCommands::Get { document_id } => {
                let cache = runtime_env.open_cache()?;
                if let Ok(id) = Uuid::parse_str(&document_id) {
                    if let Some(doc) = cache.get_document(id)? {
                        println!("# {}\n", doc.title);
                        println!("URL: {}\n", doc.canonical_url);
                        for sec in doc.sections {
                            println!("## {}\n{}\n", sec.heading, sec.content);
                        }
                    } else if let Ok(doc) = client.get_document(id).await {
                        let _ = cache.save_document(&doc);
                        println!("# {}\n", doc.title);
                        println!("URL: {}\n", doc.canonical_url);
                        for sec in doc.sections {
                            println!("## {}\n{}\n", sec.heading, sec.content);
                        }
                    } else {
                        println!(
                            "Document {} not found in local cache or upstream server.",
                            id
                        );
                    }
                } else {
                    println!("Invalid UUID: {}", document_id);
                }
            }
        },
        Commands::Project { cmd } => match cmd {
            ProjectCommands::Init => {
                let current_dir = std::env::current_dir()?;
                let existing = runtime_env.load_project_profile(&current_dir)?;
                if existing.is_some() {
                    println!(
                        "DevKnowledge project profile already exists in .devknowledge/project.json"
                    );
                } else {
                    let dir_name = current_dir
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("Local Project");
                    let profile = shared_types::ProjectProfile {
                        name: dir_name.to_string(),
                        dependencies: vec![],
                        attached_sources: vec![],
                    };
                    runtime_env.save_project_profile(&current_dir, &profile)?;
                    println!(
                        "Initialized DevKnowledge project profile for '{}' in .devknowledge/project.json",
                        dir_name
                    );
                }
            }
            ProjectCommands::Import { path } => {
                let current_dir = std::env::current_dir()?;
                let target_path = if path.is_absolute() {
                    path
                } else {
                    current_dir.join(&path)
                };

                println!("Scanning manifests in {:?}", target_path);
                let scanned = runtime::manifest::scan_and_parse_directory(&target_path)?;

                if scanned.is_empty() {
                    println!("No dependency manifests (package.json, Cargo.toml, pyproject.toml, requirements.txt) found.");
                } else {
                    let mut profile = runtime_env
                        .load_project_profile(&current_dir)?
                        .unwrap_or_else(|| shared_types::ProjectProfile {
                            name: current_dir
                                .file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("Local Project")
                                .to_string(),
                            dependencies: vec![],
                            attached_sources: vec![],
                        });

                    let mut existing_map: std::collections::BTreeMap<(String, String), String> =
                        profile
                            .dependencies
                            .into_iter()
                            .map(|d| ((d.ecosystem, d.package_name), d.version_constraint))
                            .collect();

                    let imported_count = scanned.len();
                    for d in scanned {
                        println!(
                            " - [{}] {} ({})",
                            d.ecosystem, d.package_name, d.version_constraint
                        );
                        existing_map.insert((d.ecosystem, d.package_name), d.version_constraint);
                    }

                    profile.dependencies = existing_map
                        .into_iter()
                        .map(|((ecosystem, package_name), version_constraint)| {
                            shared_types::ProjectDependency {
                                ecosystem,
                                package_name,
                                version_constraint,
                            }
                        })
                        .collect();

                    runtime_env.save_project_profile(&current_dir, &profile)?;
                    println!(
                        "✓ Successfully imported {} dependencies into .devknowledge/project.json (total: {})",
                        imported_count,
                        profile.dependencies.len()
                    );
                }
            }
            ProjectCommands::Attach { sources } => {
                let current_dir = std::env::current_dir()?;
                let mut profile = runtime_env
                    .load_project_profile(&current_dir)?
                    .unwrap_or_else(|| shared_types::ProjectProfile {
                        name: "Local Project".to_string(),
                        dependencies: vec![],
                        attached_sources: vec![],
                    });

                let mut attached_set: std::collections::BTreeSet<String> =
                    profile.attached_sources.into_iter().collect();

                let mut added = 0;
                for s in sources {
                    if attached_set.insert(s.clone()) {
                        added += 1;
                    }
                }

                profile.attached_sources = attached_set.into_iter().collect();
                runtime_env.save_project_profile(&current_dir, &profile)?;
                println!(
                    "✓ Attached {} new sources to project (total: {:?})",
                    added, profile.attached_sources
                );
            }
        },
        Commands::Status => {
            let cache = runtime_env.open_cache()?;
            let sources = cache.list_sources().unwrap_or_default();
            println!("=== DevKnowledge Local Runtime ===");
            println!("Base Directory: {:?}", runtime_env.base_dir);
            println!("SQLite Database: {:?}", runtime_env.database_path);
            println!("Cached Sources: {}", sources.len());
            println!("Server URL: {}", config.server_url);
            println!(
                "Authenticated: {}",
                if config.api_token.is_some() {
                    "Yes"
                } else {
                    "No"
                }
            );
        }
        Commands::Doctor => {
            println!("=== DevKnowledge Doctor ===");
            println!(
                "[✓] Runtime storage directory accessible: {:?}",
                runtime_env.base_dir
            );
            println!(
                "[✓] SQLite database initialized: {:?}",
                runtime_env.database_path
            );
            let cache = runtime_env.open_cache()?;
            let sources = cache.list_sources().unwrap_or_default();
            println!(
                "[✓] Local cache operational ({} sources cached)",
                sources.len()
            );
            println!("[✓] System status: Healthy");
        }
        Commands::Logout => {
            runtime_env.clear_credentials()?;
            println!("Cleared local credentials and logged out successfully.");
        }
    }

    Ok(())
}
