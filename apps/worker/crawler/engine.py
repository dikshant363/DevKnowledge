import asyncio
from datetime import datetime, timezone
from typing import Set, Dict, List, Optional
from urllib.parse import urlparse
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.database.models import DocumentationSource, DocumentationPage, CrawlJob
from apps.worker.crawler.safe_client import SafeHTTPClient
from apps.worker.crawler.discovery import DocumentDiscovery
from apps.worker.crawler.extractor import ContentExtractor, ExtractedDocument


class CrawlEngine:
    """
    Asynchronous universal documentation crawler with SSRF protection,
    depth tracking, and framework-aware extraction.
    """

    def __init__(self, client: Optional[SafeHTTPClient] = None):
        self.client = client or SafeHTTPClient()
        self.discovery = DocumentDiscovery(self.client)

    @staticmethod
    def is_path_allowed(url: str, allowed_paths: List[str], excluded_paths: List[str]) -> bool:
        path = urlparse(url).path

        if excluded_paths:
            for excl in excluded_paths:
                if excl and path.startswith(excl):
                    return False

        if allowed_paths:
            return any(path.startswith(allow) for allow in allowed_paths if allow)

        return True

    async def crawl_source(
        self,
        db: AsyncSession,
        source: DocumentationSource,
        job: CrawlJob,
    ) -> int:
        """
        Executes crawl workflow for a documentation source and records pages.
        Returns number of successfully extracted pages.
        """
        config = source.crawl_config or {}
        max_pages = config.get("max_pages", 500)
        max_depth = config.get("max_depth", 5)
        allowed_paths = config.get("allowed_paths", [])
        excluded_paths = config.get("excluded_paths", [])

        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        source.status = "crawling"
        await db.commit()

        queue: List[tuple[str, int]] = [(source.root_url, 0)]
        visited: Set[str] = {source.root_url}
        pages_processed = 0
        pages_failed = 0

        # Step 1: Discover sitemap URLs if available
        sitemap_urls = await self.discovery.discover_sitemap(source.root_url)
        for s_url in sitemap_urls:
            if s_url not in visited and len(queue) < max_pages:
                if self.is_path_allowed(s_url, allowed_paths, excluded_paths):
                    queue.append((s_url, 1))
                    visited.add(s_url)

        job.pages_discovered = len(queue)
        await db.commit()

        # Step 2: Breadth-first crawl loop
        while queue and pages_processed < max_pages:
            current_url, depth = queue.pop(0)

            try:
                resp = await self.client.get(current_url)
                if resp.status_code != 200 or "text/html" not in resp.headers.get("content-type", "text/html"):
                    continue

                html = resp.text
                extracted: ExtractedDocument = ContentExtractor.extract(html, current_url)

                # Persist or update DocumentationPage
                parsed = urlparse(current_url)
                norm_path = parsed.path or "/"

                existing_page_res = await db.execute(
                    select(DocumentationPage).where(
                        and_(
                            DocumentationPage.source_id == source.id,
                            DocumentationPage.canonical_url == current_url,
                        )
                    )
                )
                page = existing_page_res.scalar_one_or_none()

                if not page:
                    page = DocumentationPage(
                        source_id=source.id,
                        canonical_url=current_url,
                        normalized_path=norm_path,
                        title=extracted.title,
                        current_content_hash=extracted.content_hash,
                        page_status="indexed",
                    )
                    db.add(page)
                else:
                    page.title = extracted.title
                    page.current_content_hash = extracted.content_hash
                    page.page_status = "indexed"

                pages_processed += 1
                job.pages_processed = pages_processed
                job.progress = min(1.0, pages_processed / max(1, job.pages_discovered))
                await db.commit()

                # Discover next links if within depth
                if depth < max_depth and len(visited) < max_pages:
                    discovered_links = self.discovery.extract_internal_links(
                        current_url, html, source.canonical_domain
                    )
                    for link in discovered_links:
                        if link not in visited and len(visited) < max_pages:
                            if self.is_path_allowed(link, allowed_paths, excluded_paths):
                                visited.add(link)
                                queue.append((link, depth + 1))
                                job.pages_discovered = len(visited)

            except Exception as e:
                pages_failed += 1
                job.pages_failed = pages_failed
                job.error_summary = f"Error crawling {current_url}: {str(e)}"
                await db.commit()
                continue

        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        source.status = "active"
        await db.commit()

        return pages_processed
