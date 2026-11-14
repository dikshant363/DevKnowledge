from apps.api.app.projects.parsers import DependencyManifestParser

SAMPLE_PACKAGE_JSON = """
{
  "name": "enterprise-app",
  "dependencies": {
    "react": "^18.2.0",
    "next": "14.2.3"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "eslint": "^8.57.0"
  },
  "peerDependencies": {
    "react-dom": "^18.2.0"
  }
}
"""

SAMPLE_CARGO_TOML = """
[package]
name = "my-service"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = "1.38"
serde = { features = ["derive"], version = "1.0.200" }
anyhow = { version = "1.0.80" }

[dev-dependencies]
rstest = "0.18"

[dependencies.axum]
version = "0.7.5"
features = ["ws"]
"""

SAMPLE_PYPROJECT_PEP621 = """
[project]
name = "api-service"
version = "1.0.0"
dependencies = [
    "fastapi>=0.111.0",
    "uvicorn[standard]>=0.30.0",
    "pydantic>=2.7.0",
    "requests; python_version >= '3.10'"
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "ruff==0.4.0"
]
"""

SAMPLE_PYPROJECT_POETRY = """
[tool.poetry]
name = "poetry-pkg"
version = "0.1.0"

[tool.poetry.dependencies]
python = "^3.11"
httpx = "^0.27.0"
celery = { version = "^5.3.0", extras = ["redis"] }
"""

SAMPLE_REQUIREMENTS_TXT = """
# Core requirements
fastapi>=0.111.0
celery[redis]>=5.2.0; python_version >= '3.10'
requests==2.31.0 # Pinned production version
-r other-requirements.txt
"""


def test_package_json_parser():
    deps = DependencyManifestParser.parse_package_json(SAMPLE_PACKAGE_JSON)
    assert len(deps) == 5
    mapping = {d.package_name: (d.ecosystem, d.version_constraint) for d in deps}
    assert mapping["react"] == ("npm", "^18.2.0")
    assert mapping["typescript"] == ("npm", "^5.4.0")
    assert mapping["react-dom"] == ("npm", "^18.2.0")


def test_cargo_toml_parser():
    deps = DependencyManifestParser.parse_cargo_toml(SAMPLE_CARGO_TOML)
    assert len(deps) == 5
    mapping = {d.package_name: (d.ecosystem, d.version_constraint) for d in deps}
    assert mapping["tokio"] == ("cargo", "1.38")
    assert mapping["serde"] == ("cargo", "1.0.200")
    assert mapping["axum"] == ("cargo", "0.7.5")
    assert mapping["rstest"] == ("cargo", "0.18")


def test_pyproject_pep621_parser():
    deps = DependencyManifestParser.parse_pyproject_toml(SAMPLE_PYPROJECT_PEP621)
    assert len(deps) == 6
    mapping = {d.package_name: (d.ecosystem, d.version_constraint) for d in deps}
    assert mapping["fastapi"] == ("pypi", ">=0.111.0")
    assert mapping["uvicorn"] == ("pypi", ">=0.30.0")
    assert mapping["pytest"] == ("pypi", ">=8.0.0")


def test_pyproject_poetry_parser():
    deps = DependencyManifestParser.parse_pyproject_toml(SAMPLE_PYPROJECT_POETRY)
    assert len(deps) == 2
    mapping = {d.package_name: (d.ecosystem, d.version_constraint) for d in deps}
    assert mapping["httpx"] == ("pypi", "^0.27.0")
    assert mapping["celery"] == ("pypi", "^5.3.0")
    assert "python" not in mapping


def test_requirements_txt_parser():
    deps = DependencyManifestParser.parse_requirements_txt(SAMPLE_REQUIREMENTS_TXT)
    assert len(deps) == 3
    mapping = {d.package_name: (d.ecosystem, d.version_constraint) for d in deps}
    assert mapping["fastapi"] == ("pypi", ">=0.111.0")
    assert mapping["celery"] == ("pypi", ">=5.2.0")
    assert mapping["requests"] == ("pypi", "==2.31.0")


def test_parse_any_dispatch():
    pkg_deps = DependencyManifestParser.parse_any("package.json", SAMPLE_PACKAGE_JSON)
    assert len(pkg_deps) > 0
    assert pkg_deps[0].ecosystem == "npm"

    cargo_deps = DependencyManifestParser.parse_any("Cargo.toml", SAMPLE_CARGO_TOML)
    assert len(cargo_deps) > 0
    assert cargo_deps[0].ecosystem == "cargo"

    pyp_deps = DependencyManifestParser.parse_any("pyproject.toml", SAMPLE_PYPROJECT_PEP621)
    assert len(pyp_deps) > 0
    assert pyp_deps[0].ecosystem == "pypi"

    req_deps = DependencyManifestParser.parse_any("requirements.txt", SAMPLE_REQUIREMENTS_TXT)
    assert len(req_deps) > 0
    assert req_deps[0].ecosystem == "pypi"
