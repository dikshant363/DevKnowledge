import json
import re
import tomllib
from typing import Dict, List, Tuple

from pydantic import BaseModel


class ParsedDependency(BaseModel):
    ecosystem: str  # npm, cargo, pypi, maven, spm
    package_name: str
    version_constraint: str


class DependencyManifestParser:
    """
    Parses project manifest files across major ecosystems to extract declared dependencies and versions.
    """

    @staticmethod
    def _split_pep508(req: str) -> Tuple[str, str]:
        clean = req.split("#")[0].split(";")[0].strip()
        if not clean:
            return "", ""
        match = re.split(r"(==|>=|<=|~=|>|<|!=)", clean, maxsplit=1)
        pkg_part = match[0].strip()
        pkg = pkg_part.split("[")[0].strip()
        ver = "".join(match[1:]).strip() if len(match) > 1 else "*"
        return pkg, ver

    @classmethod
    def parse_package_json(cls, content: str) -> List[ParsedDependency]:
        deps: List[ParsedDependency] = []
        try:
            data = json.loads(content)
            all_deps: Dict[str, str] = {}
            for key in (
                "dependencies",
                "devDependencies",
                "peerDependencies",
                "optionalDependencies",
            ):
                block = data.get(key)
                if isinstance(block, dict):
                    all_deps.update({k: str(v) for k, v in block.items()})

            for pkg, ver in all_deps.items():
                deps.append(
                    ParsedDependency(ecosystem="npm", package_name=pkg, version_constraint=ver)
                )
        except Exception:
            pass
        return deps

    @classmethod
    def parse_cargo_toml(cls, content: str) -> List[ParsedDependency]:
        deps: List[ParsedDependency] = []
        try:
            data = tomllib.loads(content)
        except Exception:
            return cls._fallback_parse_cargo_toml(content)

        dep_sections = [
            data.get("dependencies", {}),
            data.get("dev-dependencies", {}),
            data.get("build-dependencies", {}),
            data.get("workspace", {}).get("dependencies", {}),
        ]

        target_dict = data.get("target", {})
        if isinstance(target_dict, dict):
            for target_val in target_dict.values():
                if isinstance(target_val, dict):
                    dep_sections.append(target_val.get("dependencies", {}))

        found: Dict[str, str] = {}
        for section in dep_sections:
            if isinstance(section, dict):
                for pkg, val in section.items():
                    if isinstance(val, str):
                        ver = val
                    elif isinstance(val, dict):
                        ver = str(val.get("version", "*"))
                    elif isinstance(val, bool) and val:
                        ver = "workspace"
                    else:
                        ver = "*"
                    found[pkg] = ver

        for pkg, ver in found.items():
            deps.append(
                ParsedDependency(ecosystem="cargo", package_name=pkg, version_constraint=ver)
            )
        return deps

    @classmethod
    def _fallback_parse_cargo_toml(cls, content: str) -> List[ParsedDependency]:
        deps: List[ParsedDependency] = []
        in_deps = False
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("[") and line.endswith("]"):
                in_deps = line in ("[dependencies]", "[dev-dependencies]", "[build-dependencies]")
                continue
            if in_deps and "=" in line and not line.startswith("#"):
                parts = line.split("=", 1)
                pkg = parts[0].strip()
                val = parts[1].strip()
                ver_match = re.search(r'["\']([^"\']+)["\']', val)
                version = ver_match.group(1) if ver_match else "*"
                deps.append(
                    ParsedDependency(
                        ecosystem="cargo", package_name=pkg, version_constraint=version
                    )
                )
        return deps

    @classmethod
    def parse_requirements_txt(cls, content: str) -> List[ParsedDependency]:
        deps: List[ParsedDependency] = []
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith(("#", "-")):
                continue
            pkg, ver = cls._split_pep508(line)
            if pkg:
                deps.append(
                    ParsedDependency(ecosystem="pypi", package_name=pkg, version_constraint=ver)
                )
        return deps

    @classmethod
    def parse_pyproject_toml(cls, content: str) -> List[ParsedDependency]:
        deps: List[ParsedDependency] = []
        try:
            data = tomllib.loads(content)
        except Exception:
            return cls._fallback_parse_pyproject_toml(content)

        found: Dict[str, str] = {}

        # 1. PEP 621 [project.dependencies]
        project = data.get("project", {})
        if isinstance(project, dict):
            for req in project.get("dependencies", []):
                if isinstance(req, str):
                    pkg, ver = cls._split_pep508(req)
                    if pkg:
                        found[pkg] = ver
            for opt_list in project.get("optional-dependencies", {}).values():
                if isinstance(opt_list, list):
                    for req in opt_list:
                        if isinstance(req, str):
                            pkg, ver = cls._split_pep508(req)
                            if pkg:
                                found[pkg] = ver

        # 2. Poetry [tool.poetry.dependencies]
        poetry = data.get("tool", {}).get("poetry", {})
        if isinstance(poetry, dict):
            poetry_deps = poetry.get("dependencies", {})
            if isinstance(poetry_deps, dict):
                for pkg, val in poetry_deps.items():
                    if pkg.lower() != "python":
                        ver = (
                            val
                            if isinstance(val, str)
                            else (str(val.get("version", "*")) if isinstance(val, dict) else "*")
                        )
                        found[pkg] = ver

        for pkg, ver in found.items():
            deps.append(
                ParsedDependency(ecosystem="pypi", package_name=pkg, version_constraint=ver)
            )
        return deps

    @classmethod
    def _fallback_parse_pyproject_toml(cls, content: str) -> List[ParsedDependency]:
        deps: List[ParsedDependency] = []
        dep_matches = re.findall(r'["\']([a-zA-Z0-9_\-]+)(?:([><=~!]+[^"\']+))?["\']', content)
        for pkg, ver in dep_matches:
            if pkg not in ("hatchling", "setuptools", "wheel", "py312", "E", "F", "W"):
                deps.append(
                    ParsedDependency(
                        ecosystem="pypi", package_name=pkg, version_constraint=ver or "*"
                    )
                )
        return deps

    @classmethod
    def parse_any(cls, filename: str, content: str) -> List[ParsedDependency]:
        fname = filename.lower()
        if fname.endswith("package.json"):
            return cls.parse_package_json(content)
        elif fname.endswith("cargo.toml"):
            return cls.parse_cargo_toml(content)
        elif fname.endswith("requirements.txt"):
            return cls.parse_requirements_txt(content)
        elif fname.endswith("pyproject.toml"):
            return cls.parse_pyproject_toml(content)
        return []
