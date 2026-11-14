import re
import xml.etree.ElementTree as ET
from typing import List, Optional, Set
from urllib.parse import urldefrag, urljoin, urlparse

from bs4 import BeautifulSoup

from apps.worker.crawler.safe_client import SafeHTTPClient


class DocumentDiscovery:
    """
    Discovers documentation pages via robots.txt, sitemaps, llms.txt, and HTML links.
    """

    def __init__(self, client: Optional[SafeHTTPClient] = None):
        self.client = client or SafeHTTPClient()

    @staticmethod
    def normalize_url(base_url: str, link: str) -> Optional[str]:
        if not link or link.startswith(("javascript:", "mailto:", "tel:", "#")):
            return None

        # Resolve relative links and remove fragments (#section)
        full_url = urljoin(base_url, link)
        defragged, _ = urldefrag(full_url)

        parsed = urlparse(defragged)
        if parsed.scheme not in ("http", "https"):
            return None

        # Clean trailing tracking params
        # Keep path clean
        normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        if parsed.query:
            # Filter out tracking query params
            filtered_query = "&".join(
                param
                for param in parsed.query.split("&")
                if not param.startswith(("utm_", "ref=", "fbclid="))
            )
            if filtered_query:
                normalized += f"?{filtered_query}"

        return normalized

    async def discover_sitemap(self, root_url: str) -> List[str]:
        """Attempts to discover and parse sitemap.xml"""
        parsed = urlparse(root_url)
        sitemap_candidates = [
            urljoin(f"{parsed.scheme}://{parsed.netloc}", "/sitemap.xml"),
            urljoin(root_url, "sitemap.xml"),
        ]

        discovered_urls: List[str] = []
        for sitemap_url in sitemap_candidates:
            try:
                resp = await self.client.get(sitemap_url)
                if resp.status_code == 200 and (
                    "xml" in resp.headers.get("content-type", "")
                    or "<urlset" in resp.text
                    or "<sitemapindex" in resp.text
                ):
                    urls = self.parse_sitemap_xml(resp.text)
                    if urls:
                        discovered_urls.extend(urls)
                        break
            except Exception:
                continue

        return discovered_urls

    def parse_sitemap_xml(self, xml_content: str) -> List[str]:
        urls = []
        try:
            # Strip namespaces for simple parsing
            xml_clean = re.sub(r'\sxmlns="[^"]+"', "", xml_content, count=1)
            root = ET.fromstring(xml_clean)

            # Direct urlset
            for url_elem in root.findall(".//url/loc"):
                if url_elem.text:
                    urls.append(url_elem.text.strip())

            # Sitemap index references
            for _sitemap_elem in root.findall(".//sitemap/loc"):
                # Nested sitemaps could be crawled recursively if needed
                pass
        except Exception:
            pass
        return urls

    async def discover_llms_txt(self, root_url: str) -> Optional[str]:
        """Checks for official llms.txt discovery file"""
        parsed = urlparse(root_url)
        llms_url = urljoin(f"{parsed.scheme}://{parsed.netloc}", "/llms.txt")
        try:
            resp = await self.client.get(llms_url)
            if resp.status_code == 200 and len(resp.text) > 20:
                return resp.text
        except Exception:
            pass
        return None

    def extract_internal_links(self, page_url: str, html: str, canonical_domain: str) -> Set[str]:
        """Extracts valid internal documentation links from HTML"""
        links: Set[str] = set()
        soup = BeautifulSoup(html, "html.parser")

        for tag in soup.find_all("a", href=True):
            href = tag["href"]
            norm = self.normalize_url(page_url, href)
            if norm:
                parsed = urlparse(norm)
                # Ensure link belongs to same domain
                if parsed.hostname and (
                    parsed.hostname == canonical_domain
                    or parsed.hostname.endswith(f".{canonical_domain}")
                ):
                    links.add(norm)

        return links
