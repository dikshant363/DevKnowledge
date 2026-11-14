import re
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup, Tag


class BaseDocumentationAdapter:
    name: str = "generic"

    def detect(self, html: str) -> bool:
        return False

    def extract_main_container(self, soup: BeautifulSoup) -> Tag:
        """Fallback: searches for semantic main containers and strips noise"""
        # Remove navigation, headers, footers, scripts, styles
        for tag in soup(["script", "style", "nav", "header", "footer", "aside", "noscript", "iframe"]):
            tag.decompose()

        # Find main content container
        main = soup.find("main") or soup.find("article") or soup.find(attrs={"role": "main"})
        if main:
            return main

        for selector in [".content", "#content", ".documentation", ".markdown-body", "#main"]:
            found = soup.select_one(selector)
            if found:
                return found

        return soup.body or soup

    def extract_title(self, soup: BeautifulSoup) -> str:
        h1 = soup.find("h1")
        if h1 and h1.get_text(strip=True):
            return h1.get_text(strip=True)
        if soup.title and soup.title.string:
            # Clean "Title | Site Name"
            title = soup.title.string.strip()
            return title.split("|")[0].split("—")[0].split(" - ")[0].strip()
        return "Untitled Document"


class DocusaurusAdapter(BaseDocumentationAdapter):
    name: str = "docusaurus"

    def detect(self, html: str) -> bool:
        return bool(
            re.search(r'data-theme=["\'](light|dark)["\']', html)
            or "__docusaurus" in html
            or 'class="theme-doc-markdown' in html
        )

    def extract_main_container(self, soup: BeautifulSoup) -> Tag:
        container = soup.select_one("article .theme-doc-markdown") or soup.select_one("article")
        if container:
            return container
        return super().extract_main_container(soup)


class MkDocsAdapter(BaseDocumentationAdapter):
    name: str = "mkdocs"

    def detect(self, html: str) -> bool:
        return bool(
            'class="md-content"' in html
            or "mkdocs" in html.lower()
            or 'data-md-component="content"' in html
        )

    def extract_main_container(self, soup: BeautifulSoup) -> Tag:
        container = soup.select_one(".md-content article") or soup.select_one(".md-content")
        if container:
            return container
        return super().extract_main_container(soup)


class VitePressAdapter(BaseDocumentationAdapter):
    name: str = "vitepress"

    def detect(self, html: str) -> bool:
        return bool(
            "VPDoc" in html
            or "vp-doc" in html
            or "vitepress" in html.lower()
        )

    def extract_main_container(self, soup: BeautifulSoup) -> Tag:
        container = soup.select_one(".VPDoc .vp-doc") or soup.select_one(".VPDoc")
        if container:
            return container
        return super().extract_main_container(soup)


class SphinxAdapter(BaseDocumentationAdapter):
    name: str = "sphinx"

    def detect(self, html: str) -> bool:
        return bool(
            'class="document"' in html
            or 'class="body"' in html
            or "sphinx" in html.lower()
            or 'id="documentation_options"' in html
        )

    def extract_main_container(self, soup: BeautifulSoup) -> Tag:
        container = soup.select_one("div.body[role='main']") or soup.select_one("div.document")
        if container:
            return container
        return super().extract_main_container(soup)


ALL_ADAPTERS = [
    DocusaurusAdapter(),
    MkDocsAdapter(),
    VitePressAdapter(),
    SphinxAdapter(),
    BaseDocumentationAdapter(), # generic fallback
]


def select_adapter(html: str) -> BaseDocumentationAdapter:
    for adapter in ALL_ADAPTERS:
        if adapter.detect(html):
            return adapter
    return ALL_ADAPTERS[-1]
