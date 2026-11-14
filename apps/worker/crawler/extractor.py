import hashlib
import re
from typing import Dict, List, Optional, Any
from bs4 import BeautifulSoup, Tag
from apps.worker.crawler.adapters.base import select_adapter


class ExtractedDocument:
    def __init__(
        self,
        title: str,
        adapter_used: str,
        sections: List[Dict[str, Any]],
        code_snippets: List[Dict[str, Any]],
        api_symbols: List[Dict[str, Any]],
        raw_markdown: str,
        content_hash: str,
    ):
        self.title = title
        self.adapter_used = adapter_used
        self.sections = sections
        self.code_snippets = code_snippets
        self.api_symbols = api_symbols
        self.raw_markdown = raw_markdown
        self.content_hash = content_hash


class ContentExtractor:
    """
    Normalizes HTML documentation into Canonical Knowledge Representation (CKR) elements.
    """

    @classmethod
    def extract(cls, html: str, url: str) -> ExtractedDocument:
        soup = BeautifulSoup(html, "html.parser")
        adapter = select_adapter(html)

        title = adapter.extract_title(soup)
        container = adapter.extract_main_container(soup)

        # 1. Extract Code Snippets
        code_snippets: List[Dict[str, Any]] = []
        for pre in container.find_all("pre"):
            code_tag = pre.find("code") or pre
            code_text = code_tag.get_text()
            if not code_text.strip():
                continue

            # Detect language
            lang = "text"
            classes = code_tag.get("class", []) + pre.get("class", [])
            for c in classes:
                if c.startswith(("language-", "lang-")):
                    lang = c.replace("language-", "").replace("lang-", "")
                    break

            code_snippets.append({
                "language": lang.lower(),
                "code": code_text.strip(),
                "line_count": len(code_text.strip().splitlines()),
            })

        # 2. Extract API Symbols & Deprecations
        api_symbols: List[Dict[str, Any]] = []
        # Find dl/dt/dd (Sphinx/standard), signature tags, or function headers
        for dt in container.find_all(["dt", ".sig", ".api-symbol"]):
            sig_text = dt.get_text(strip=True)
            if "(" in sig_text or "class " in sig_text or "fn " in sig_text:
                dd = dt.find_next_sibling("dd")
                desc = dd.get_text(strip=True) if dd else None
                is_dep = bool("deprecated" in sig_text.lower() or (desc and "deprecated" in desc.lower()))

                # Extract symbol name
                name_match = re.search(r'([A-Za-z0-9_]+)\s*\(', sig_text)
                sym_name = name_match.group(1) if name_match else sig_text.split()[0]

                api_symbols.append({
                    "name": sym_name,
                    "symbol_type": "function" if "(" in sig_text else "symbol",
                    "signature": sig_text,
                    "description": desc,
                    "is_deprecated": is_dep,
                })

        # 3. Extract Section Hierarchy
        sections: List[Dict[str, Any]] = []
        markdown_lines: List[str] = [f"# {title}\n"]

        current_heading = "Overview"
        current_level = 1
        current_text_parts: List[str] = []

        for elem in container.find_all(["h1", "h2", "h3", "h4", "p", "ul", "ol", "pre", "table"]):
            if elem.name in ["h1", "h2", "h3", "h4"]:
                # Save previous section
                if current_text_parts:
                    content_str = "\n".join(current_text_parts).strip()
                    sec_hash = hashlib.sha256(content_str.encode("utf-8")).hexdigest()
                    sections.append({
                        "id": re.sub(r'[^a-z0-9]+', '-', current_heading.lower()).strip('-'),
                        "heading": current_heading,
                        "level": current_level,
                        "content": content_str,
                        "content_hash": sec_hash,
                    })
                    current_text_parts = []

                current_heading = elem.get_text(strip=True)
                current_level = int(elem.name[1])
                markdown_lines.append(f"\n{'#' * current_level} {current_heading}\n")
            elif elem.name == "p":
                p_text = elem.get_text(strip=True)
                if p_text:
                    current_text_parts.append(p_text)
                    markdown_lines.append(f"{p_text}\n")
            elif elem.name in ["ul", "ol"]:
                for li in elem.find_all("li", recursive=False):
                    li_text = li.get_text(strip=True)
                    if li_text:
                        current_text_parts.append(f"- {li_text}")
                        markdown_lines.append(f"- {li_text}")
                markdown_lines.append("")
            elif elem.name == "pre":
                code_tag = elem.find("code") or elem
                code_text = code_tag.get_text().strip()
                if code_text:
                    markdown_lines.append(f"```\n{code_text}\n```\n")

        # Save last section
        if current_text_parts:
            content_str = "\n".join(current_text_parts).strip()
            sec_hash = hashlib.sha256(content_str.encode("utf-8")).hexdigest()
            sections.append({
                "id": re.sub(r'[^a-z0-9]+', '-', current_heading.lower()).strip('-'),
                "heading": current_heading,
                "level": current_level,
                "content": content_str,
                "content_hash": sec_hash,
            })

        raw_markdown = "\n".join(markdown_lines).strip()
        doc_hash = hashlib.sha256(raw_markdown.encode("utf-8")).hexdigest()

        return ExtractedDocument(
            title=title,
            adapter_used=adapter.name,
            sections=sections,
            code_snippets=code_snippets,
            api_symbols=api_symbols,
            raw_markdown=raw_markdown,
            content_hash=doc_hash,
        )
