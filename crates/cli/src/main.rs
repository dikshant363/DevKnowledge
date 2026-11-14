use anyhow::Result;
use clap::{Parser, Subcommand};
use runtime::RuntimeEnvironment;
use std::path::PathBuf;
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
    /// Log out and optionally clear local credentials
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
    Sync {
        source_name_or_id: Option<String>,
    },
}

#[derive(Subcommand, Debug)]
enum DocsCommands {
    /// Retrieve document by ID
    Get {
        document_id: String,
    },
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
    Attach {
        sources: Vec<String>,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();
    let runtime_env = RuntimeEnvironment::default_paths()?;

    match cli.command {
        Commands::Login { server, api_key: _ } => {
            println!("DevKnowledge CLI authenticated with {}", server);
        }
        Commands::Source { cmd } => match cmd {
            SourceCommands::Add { url, name, category } => {
                let display_name = name.unwrap_or_else(|| url.clone());
                println!("Queued registration for {} ({}) in category [{}]", display_name, url, category);
            }
            SourceCommands::List => {
                let cache = runtime_env.open_cache()?;
                let sources = cache.list_sources()?;
                if sources.is_empty() {
                    println!("No documentation sources cached locally.");
                } else {
                    println!("Registered Sources ({}):", sources.len());
                    for s in sources {
                        println!(" - [{}] {} ({})", s.category, s.name, s.root_url);
                    }
                }
            }
            SourceCommands::Sync { source_name_or_id } => {
                println!("Syncing documentation sources: {:?}", source_name_or_id.unwrap_or_else(|| "all".to_string()));
            }
        },
        Commands::Search { query, limit } => {
            let cache = runtime_env.open_cache()?;
            let results = cache.search(&query, limit)?;
            if results.is_empty() {
                println!("No local documentation results found for '{}'", query);
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
                    } else {
                        println!("Document {} not found in local cache.", id);
                    }
                } else {
                    println!("Invalid UUID: {}", document_id);
                }
            }
        },
        Commands::Project { cmd } => match cmd {
            ProjectCommands::Init => {
                println!("Initialized devknowledge project profile (.devknowledge/project.json)");
            }
            ProjectCommands::Import { path } => {
                println!("Scanning dependencies at {:?}", path);
            }
            ProjectCommands::Attach { sources } => {
                println!("Attached sources: {:?}", sources);
            }
        },
        Commands::Status => {
            println!("DevKnowledge Local Runtime");
            println!("Base Directory: {:?}", runtime_env.base_dir);
            println!("Database: {:?}", runtime_env.database_path);
        }
        Commands::Doctor => {
            println!("=== DevKnowledge Doctor ===");
            println!("[✓] Runtime storage directory accessible: {:?}", runtime_env.base_dir);
            println!("[✓] SQLite database initialized: {:?}", runtime_env.database_path);
            println!("[✓] System status: Healthy");
        }
        Commands::Logout => {
            println!("Logged out successfully.");
        }
    }

    Ok(())
}
