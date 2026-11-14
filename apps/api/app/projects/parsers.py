import json
import re
from typing import List

from pydantic import BaseModel


class ParsedDependency(BaseModel):
    ecosystem: str  # npm, cargo, pypi, maven, spm
    package_name: str
    version_constraint: str


class DependencyManifestParser:
    """
    Parses project manifest files across major ecosystems to extract declared dependencies and versions.
    """

    @classmethod
    def parse_package_json(cls, content: str) -> List[ParsedDependency]:
        deps: List[ParsedDependency] = []
        try:
            data = json.loads(content)
            all_deps = {}
            if "dependencies" in data and isinstance(data["dependencies"], dict):
                all_deps.update(data["dependencies"])
            if "devDependencies" in data and isinstance(data["devDependencies"], dict):
                all_deps.update(data["devDependencies"])

            for pkg, ver in all_deps.items():
                deps.append(
                    ParsedDependency(ecosystem="npm", package_name=pkg, version_constraint=str(ver))
                )
        except Exception:
            pass
        return deps

    @classmethod
    def parse_cargo_toml(cls, content: str) -> List[ParsedDependency]:
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
                # Check simple string version e.g. tokio = "1.0"
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
            # Match package==1.2.3 or package>=1.2.3
            match = re.split(r"(==|>=|<=|~=|>|<)", line)
            if match:
                pkg = match[0].strip()
                ver = "".join(match[1:]).strip() if len(match) > 1 else "*"
                deps.append(
                    ParsedDependency(ecosystem="pypi", package_name=pkg, version_constraint=ver)
                )
        return deps

    @classmethod
    def parse_pyproject_toml(cls, content: str) -> List[ParsedDependency]:
        deps: List[ParsedDependency] = []
        # Find dependencies array
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
