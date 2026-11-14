use anyhow::Result;
use shared_types::ProjectDependency;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

/// Parses package.json content for dependencies across all dependency blocks.
pub fn parse_package_json(content: &str) -> Result<Vec<ProjectDependency>> {
    let mut deps = Vec::new();
    let parsed: serde_json::Value = match serde_json::from_str(content) {
        Ok(v) => v,
        Err(_) => return Ok(deps),
    };

    let dep_keys = [
        "dependencies",
        "devDependencies",
        "peerDependencies",
        "optionalDependencies",
    ];

    for key in dep_keys {
        if let Some(dep_map) = parsed.get(key).and_then(|v| v.as_object()) {
            for (pkg, ver_val) in dep_map {
                let ver = ver_val.as_str().unwrap_or("*");
                deps.push(ProjectDependency {
                    ecosystem: "npm".to_string(),
                    package_name: pkg.clone(),
                    version_constraint: ver.to_string(),
                });
            }
        }
    }

    Ok(deps)
}

/// Parses Cargo.toml content extracting declared dependencies from standard sections and tables.
pub fn parse_cargo_toml(content: &str) -> Result<Vec<ProjectDependency>> {
    let mut deps: BTreeMap<String, String> = BTreeMap::new();
    let mut current_section = String::new();
    let mut current_table_dep: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            let section = &trimmed[1..trimmed.len() - 1].trim();
            current_section = section.to_string();

            if let Some(dep_name) = section.strip_prefix("dependencies.") {
                current_table_dep = Some(dep_name.trim().to_string());
            } else if let Some(dep_name) = section.strip_prefix("dev-dependencies.") {
                current_table_dep = Some(dep_name.trim().to_string());
            } else if let Some(dep_name) = section.strip_prefix("build-dependencies.") {
                current_table_dep = Some(dep_name.trim().to_string());
            } else {
                current_table_dep = None;
            }
            continue;
        }

        let is_dep_section = current_section == "dependencies"
            || current_section == "dev-dependencies"
            || current_section == "build-dependencies"
            || current_section == "workspace.dependencies"
            || current_section.ends_with(".dependencies");

        if let Some(ref dep_name) = current_table_dep {
            if trimmed.starts_with("version") && trimmed.contains('=') {
                if let Some(ver) = extract_quoted_value(trimmed) {
                    deps.insert(dep_name.clone(), ver);
                }
            }
        } else if is_dep_section && trimmed.contains('=') {
            let parts: Vec<&str> = trimmed.splitn(2, '=').collect();
            if parts.len() == 2 {
                let pkg = parts[0].trim().to_string();
                let val = parts[1].trim();

                let version = if val.starts_with('{') {
                    // Extract version = "..." from inline table
                    extract_inline_version(val).unwrap_or_else(|| "*".to_string())
                } else if let Some(ver) = extract_quoted_value(val) {
                    ver
                } else {
                    "*".to_string()
                };

                deps.insert(pkg, version);
            }
        }
    }

    let result = deps
        .into_iter()
        .map(|(pkg, ver)| ProjectDependency {
            ecosystem: "cargo".to_string(),
            package_name: pkg,
            version_constraint: ver,
        })
        .collect();

    Ok(result)
}

/// Parses pyproject.toml content for PEP 621 dependencies and Poetry dependencies.
pub fn parse_pyproject_toml(content: &str) -> Result<Vec<ProjectDependency>> {
    let mut deps: BTreeMap<String, String> = BTreeMap::new();
    let mut in_project_deps = false;
    let mut in_poetry_deps = false;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            let section = &trimmed[1..trimmed.len() - 1].trim();
            in_project_deps = *section == "project";
            in_poetry_deps = *section == "tool.poetry.dependencies";
            continue;
        }

        if in_project_deps {
            if trimmed.starts_with("dependencies") && trimmed.contains('=') {
                // If dependencies = [ on one line or multiple lines
                for dep_str in extract_array_entries(content, "dependencies") {
                    if let Some((pkg, ver)) = parse_pep508_requirement(&dep_str) {
                        deps.insert(pkg, ver);
                    }
                }
                in_project_deps = false;
            }
        } else if in_poetry_deps && trimmed.contains('=') {
            let parts: Vec<&str> = trimmed.splitn(2, '=').collect();
            if parts.len() == 2 {
                let pkg = parts[0].trim().to_string();
                if pkg != "python" {
                    let val = parts[1].trim();
                    let ver = extract_quoted_value(val).unwrap_or_else(|| "*".to_string());
                    deps.insert(pkg, ver);
                }
            }
        }
    }

    let result = deps
        .into_iter()
        .map(|(pkg, ver)| ProjectDependency {
            ecosystem: "pypi".to_string(),
            package_name: pkg,
            version_constraint: ver,
        })
        .collect();

    Ok(result)
}

/// Parses requirements.txt content into PyPI dependencies.
pub fn parse_requirements_txt(content: &str) -> Result<Vec<ProjectDependency>> {
    let mut deps = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with('-') {
            continue;
        }

        // Split off comments
        let cleaned = trimmed.split('#').next().unwrap_or("").trim();
        // Split off environment markers
        let cleaned = cleaned.split(';').next().unwrap_or("").trim();

        if let Some((pkg, ver)) = parse_pep508_requirement(cleaned) {
            deps.push(ProjectDependency {
                ecosystem: "pypi".to_string(),
                package_name: pkg,
                version_constraint: ver,
            });
        }
    }
    Ok(deps)
}

/// Scans a directory for known manifest files (package.json, Cargo.toml, pyproject.toml, requirements.txt)
/// and returns all discovered dependencies.
pub fn scan_and_parse_directory<P: AsRef<Path>>(dir: P) -> Result<Vec<ProjectDependency>> {
    let dir_path = dir.as_ref();
    let mut all_deps: BTreeMap<(String, String), String> = BTreeMap::new();

    let pkg_json = dir_path.join("package.json");
    if pkg_json.exists() {
        if let Ok(c) = fs::read_to_string(&pkg_json) {
            if let Ok(deps) = parse_package_json(&c) {
                for d in deps {
                    all_deps.insert((d.ecosystem, d.package_name), d.version_constraint);
                }
            }
        }
    }

    let cargo_toml = dir_path.join("Cargo.toml");
    if cargo_toml.exists() {
        if let Ok(c) = fs::read_to_string(&cargo_toml) {
            if let Ok(deps) = parse_cargo_toml(&c) {
                for d in deps {
                    all_deps.insert((d.ecosystem, d.package_name), d.version_constraint);
                }
            }
        }
    }

    let pyproject = dir_path.join("pyproject.toml");
    if pyproject.exists() {
        if let Ok(c) = fs::read_to_string(&pyproject) {
            if let Ok(deps) = parse_pyproject_toml(&c) {
                for d in deps {
                    all_deps.insert((d.ecosystem, d.package_name), d.version_constraint);
                }
            }
        }
    }

    let reqs = dir_path.join("requirements.txt");
    if reqs.exists() {
        if let Ok(c) = fs::read_to_string(&reqs) {
            if let Ok(deps) = parse_requirements_txt(&c) {
                for d in deps {
                    all_deps.insert((d.ecosystem, d.package_name), d.version_constraint);
                }
            }
        }
    }

    let result = all_deps
        .into_iter()
        .map(
            |((ecosystem, package_name), version_constraint)| ProjectDependency {
                ecosystem,
                package_name,
                version_constraint,
            },
        )
        .collect();

    Ok(result)
}

// Helpers
fn extract_quoted_value(s: &str) -> Option<String> {
    let first_quote = s.find(['"', '\''])?;
    let remainder = &s[first_quote + 1..];
    let next_quote = remainder.find(['"', '\''])?;
    Some(remainder[..next_quote].to_string())
}

fn extract_inline_version(table_str: &str) -> Option<String> {
    for part in table_str.split(',') {
        let trimmed = part.trim().trim_matches('{').trim_matches('}');
        if trimmed.starts_with("version") && trimmed.contains('=') {
            return extract_quoted_value(trimmed);
        }
    }
    None
}

fn is_array_closed(line: &str) -> bool {
    let mut in_quote = false;
    let mut quote_char = ' ';
    for c in line.chars() {
        if in_quote {
            if c == quote_char {
                in_quote = false;
            }
        } else if c == '"' || c == '\'' {
            in_quote = true;
            quote_char = c;
        } else if c == ']' {
            return true;
        }
    }
    false
}

fn extract_array_entries(content: &str, field_name: &str) -> Vec<String> {
    let mut entries = Vec::new();
    let mut in_array = false;

    for line in content.lines() {
        let trimmed = line.trim();
        if !in_array {
            if trimmed.starts_with(field_name) && trimmed.contains('=') && trimmed.contains('[') {
                in_array = true;
                extract_strings_from_line(trimmed, &mut entries);
                let after_bracket = trimmed.split_once('[').map(|x| x.1).unwrap_or("");
                if is_array_closed(after_bracket) {
                    break;
                }
            }
        } else {
            extract_strings_from_line(trimmed, &mut entries);
            if is_array_closed(trimmed) {
                break;
            }
        }
    }

    entries
}

fn extract_strings_from_line(line: &str, out: &mut Vec<String>) {
    let mut chars = line.char_indices().peekable();
    while let Some((_, c)) = chars.next() {
        if c == '"' || c == '\'' {
            let quote = c;
            let mut s = String::new();
            for (_, inner) in chars.by_ref() {
                if inner == quote {
                    break;
                }
                s.push(inner);
            }
            if !s.is_empty() {
                out.push(s);
            }
        }
    }
}

fn parse_pep508_requirement(req: &str) -> Option<(String, String)> {
    let trimmed = req.trim();
    if trimmed.is_empty() {
        return None;
    }

    let op_idx = trimmed.find(['=', '>', '<', '~', '!']);
    if let Some(idx) = op_idx {
        let pkg_part = trimmed[..idx].trim();
        // Remove extras like uvicorn[standard]
        let pkg_name = pkg_part.split('[').next().unwrap_or(pkg_part).trim();
        let ver = trimmed[idx..].trim();
        Some((pkg_name.to_string(), ver.to_string()))
    } else {
        let pkg_name = trimmed.split('[').next().unwrap_or(trimmed).trim();
        Some((pkg_name.to_string(), "*".to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_package_json() {
        let json = r#"{
            "name": "sample",
            "dependencies": {
                "react": "^18.2.0",
                "next": "14.2.3"
            },
            "devDependencies": {
                "typescript": "^5.4.0"
            }
        }"#;

        let deps = parse_package_json(json).expect("Should parse");
        assert_eq!(deps.len(), 3);
        let react = deps.iter().find(|d| d.package_name == "react").unwrap();
        assert_eq!(react.version_constraint, "^18.2.0");
        assert_eq!(react.ecosystem, "npm");
    }

    #[test]
    fn test_parse_cargo_toml() {
        let toml = r#"
        [package]
        name = "test"
        version = "0.1.0"

        [dependencies]
        tokio = "1.38"
        serde = { features = ["derive"], version = "1.0" }
        anyhow = { version = "1.0.80" }

        [dependencies.axum]
        version = "0.7.5"
        features = ["ws"]
        "#;

        let deps = parse_cargo_toml(toml).expect("Should parse");
        assert_eq!(deps.len(), 4);

        let tokio = deps.iter().find(|d| d.package_name == "tokio").unwrap();
        assert_eq!(tokio.version_constraint, "1.38");

        let serde = deps.iter().find(|d| d.package_name == "serde").unwrap();
        assert_eq!(serde.version_constraint, "1.0");

        let axum = deps.iter().find(|d| d.package_name == "axum").unwrap();
        assert_eq!(axum.version_constraint, "0.7.5");
    }

    #[test]
    fn test_parse_pyproject_toml() {
        let toml = r#"
        [project]
        name = "test"
        version = "0.1.0"
        dependencies = [
            "fastapi>=0.111.0",
            "uvicorn[standard]>=0.30.0",
            "pydantic>=2.7.0"
        ]
        "#;

        let deps = parse_pyproject_toml(toml).expect("Should parse");
        assert_eq!(deps.len(), 3);

        let uvicorn = deps.iter().find(|d| d.package_name == "uvicorn").unwrap();
        assert_eq!(uvicorn.version_constraint, ">=0.30.0");
        assert_eq!(uvicorn.ecosystem, "pypi");
    }

    #[test]
    fn test_parse_requirements_txt() {
        let reqs = r#"
        # Core deps
        fastapi>=0.111.0
        celery[redis]>=5.2.0; python_version >= '3.10'
        requests==2.31.0 # pinned
        "#;

        let deps = parse_requirements_txt(reqs).expect("Should parse");
        assert_eq!(deps.len(), 3);

        let celery = deps.iter().find(|d| d.package_name == "celery").unwrap();
        assert_eq!(celery.package_name, "celery");
        assert_eq!(celery.version_constraint, ">=5.2.0");
    }
}
