import pytest
import httpx
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from apps.api.app.database.models import Base, DocumentationSource, CrawlJob, DocumentationPage
from apps.worker.crawler.extractor import ContentExtractor
from apps.worker.crawler.discovery import DocumentDiscovery
from apps.worker.crawler.engine import CrawlEngine
from apps.worker.crawler.safe_client import SafeHTTPClient


SAMPLE_DOCUSAURUS_HTML = """
<!DOCTYPE html>
<html data-theme="dark">
<head><title>Getting Started with React | Docusaurus Docs</title></head>
<body>
  <nav><a href="/home">Home</a></nav>
  <main>
    <article class="theme-doc-markdown">
      <h1>Getting Started with React</h1>
      <p>React is a library for web and native user interfaces.</p>
      <h2>Installation</h2>
      <p>Install React using pnpm or npm:</p>
      <pre><code class="language-bash">pnpm add react react-dom</code></pre>
      <div class="alert deprecated">
        <strong>Warning:</strong> ReactDOM.render is deprecated in React 18+. Use createRoot instead.
      </div>
      <h2>API Reference</h2>
      <dt class="sig">useState(initialState)</dt>
      <dd>Returns a stateful value and a function to update it.</dd>
    </article>
  </main>
  <footer>Copyright 2026</footer>
</body>
</html>
"""

SAMPLE_MKDOCS_HTML = """
<!DOCTYPE html>
<html>
<head><title>Configuration - MkDocs Material</title></head>
<body>
  <div class="md-content">
    <article>
      <h1>Configuration</h1>
      <p>Learn how to configure mkdocs.yml.</p>
      <pre><code class="language-yaml">site_name: My Project
theme: material</code></pre>
    </article>
  </div>
</body>
</html>
"""


def test_content_extractor_docusaurus():
    doc = ContentExtractor.extract(SAMPLE_DOCUSAURUS_HTML, "https://example.com/docs/intro")
    assert doc.title == "Getting Started with React"
    assert doc.adapter_used == "docusaurus"
    assert len(doc.sections) >= 2
    assert len(doc.code_snippets) == 1
    assert doc.code_snippets[0]["language"] == "bash"
    assert "pnpm add react" in doc.code_snippets[0]["code"]
    assert len(doc.api_symbols) >= 1
    assert doc.api_symbols[0]["name"] == "useState"
    assert doc.content_hash is not None


def test_content_extractor_mkdocs():
    doc = ContentExtractor.extract(SAMPLE_MKDOCS_HTML, "https://example.com/mkdocs/config")
    assert doc.title == "Configuration"
    assert doc.adapter_used == "mkdocs"
    assert len(doc.code_snippets) == 1
    assert doc.code_snippets[0]["language"] == "yaml"


def test_discovery_url_normalization():
    base = "https://developer.android.com/reference/kotlin/"
    assert DocumentDiscovery.normalize_url(base, "androidx/compose/material3/Button.html#params") == (
        "https://developer.android.com/reference/kotlin/androidx/compose/material3/Button.html"
    )
    assert DocumentDiscovery.normalize_url(base, "javascript:void(0)") is None
    assert DocumentDiscovery.normalize_url(base, "#overview") is None
    # Strips tracking params
    assert DocumentDiscovery.normalize_url(base, "docs?utm_source=twitter&ref=blog&page=1") == (
        "https://developer.android.com/reference/kotlin/docs?page=1"
    )


def test_discovery_internal_links():
    discovery = DocumentDiscovery()
    html = """
    <html><body>
      <a href="/guide/first-app">First App</a>
      <a href="https://developer.android.com/guide/navigation">Navigation</a>
      <a href="https://external.com/other">External Site</a>
    </body></html>
    """
    links = discovery.extract_internal_links(
        "https://developer.android.com/guide/", html, "developer.android.com"
    )
    assert "https://developer.android.com/guide/first-app" in links
    assert "https://developer.android.com/guide/navigation" in links
    assert "https://external.com/other" not in links


@pytest.mark.asyncio
async def test_crawl_engine_workflow():
    # Setup test DB
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        # Create test source & job
        source = DocumentationSource(
            organization_id="org_test_123",
            name="React Docs",
            root_url="https://react.dev/learn",
            canonical_domain="react.dev",
            category="frontend-development",
            crawl_config={"max_pages": 5, "max_depth": 2},
        )
        session.add(source)
        await session.flush()

        job = CrawlJob(
            source_id=source.id,
            job_type="discovery",
            status="pending",
        )
        session.add(job)
        await session.commit()

        # Mock SafeHTTPClient to return sample HTML without real network
        mock_client = AsyncMock()
        mock_resp = httpx.Response(
            200,
            headers={"content-type": "text/html; charset=utf-8"},
            text=SAMPLE_DOCUSAURUS_HTML,
            request=httpx.Request("GET", "https://react.dev/learn"),
        )
        mock_client.get = AsyncMock(return_value=mock_resp)

        crawler = CrawlEngine(client=mock_client)
        # Suppress sitemap discovery for unit test
        crawler.discovery.discover_sitemap = AsyncMock(return_value=[])

        processed = await crawler.crawl_source(session, source, job)
        assert processed >= 1
        assert job.status == "completed"
        assert source.status == "active"

        # Verify page record in DB
        pages = (await session.execute(Base.metadata.tables["documentation_pages"].select())).all()
        assert len(pages) >= 1
        assert pages[0].title == "Getting Started with React"
        assert pages[0].current_content_hash is not None

    await engine.dispose()
