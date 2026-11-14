import uuid
from unittest.mock import AsyncMock

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.app.database.models import CrawlJob, DocumentationSource
from apps.api.app.database.session import AsyncSessionLocal, Base, engine
from apps.api.app.main import app
from apps.worker.crawler.engine import CrawlEngine

SAMPLE_FRAMEWORK_DOCS = """
<!DOCTYPE html>
<html>
<head><title>FastAPI Framework - High Performance Web APIs</title></head>
<body>
  <main>
    <article>
      <h1>FastAPI Framework</h1>
      <p>FastAPI is a modern, fast web framework for building APIs with Python.</p>
      <h2>Quickstart</h2>
      <pre><code class="language-python">from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "ok"}
      </code></pre>
      <h2>APIs</h2>
      <dt class="sig">FastAPI(title, version)</dt>
      <dd>Main application class for mounting routes.</dd>
    </article>
  </main>
</body>
</html>
"""


@pytest.mark.asyncio
async def test_full_system_end_to_end():
    # 0. Initialize database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    uid = uuid.uuid4().hex[:6]
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. User registers
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": f"e2e_{uid}@devknowledge.dev",
                "password": "ProductionReady123!",
                "display_name": "E2E Lead",
            },
        )
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Register documentation source
        source_url = f"https://fastapi.tiangolo.com/e2e-{uid}"
        src_res = await client.post(
            "/api/v1/sources",
            json={
                "root_url": source_url,
                "name": "FastAPI Official Documentation",
                "category": "backend-development",
                "version": "0.111.0",
            },
            headers=headers,
        )
        assert src_res.status_code == 201
        source_id = src_res.json()["id"]

        # 3. Simulate crawler worker crawling the source
        async with AsyncSessionLocal() as session:
            job = CrawlJob(source_id=source_id, job_type="full_crawl", status="pending")
            session.add(job)
            await session.commit()

            src_db = await session.get(DocumentationSource, source_id)
            mock_client = AsyncMock()
            mock_resp = httpx.Response(
                200,
                headers={"content-type": "text/html; charset=utf-8"},
                text=SAMPLE_FRAMEWORK_DOCS,
                request=httpx.Request("GET", source_url),
            )
            mock_client.get = AsyncMock(return_value=mock_resp)

            crawler = CrawlEngine(client=mock_client)
            crawler.discovery.discover_sitemap = AsyncMock(return_value=[])
            processed = await crawler.crawl_source(session, src_db, job)
            assert processed >= 1

        # 4. Compile Knowledge Artifacts (Snapshot v1)
        comp_res = await client.post(f"/api/v1/sources/{source_id}/compile", headers=headers)
        assert comp_res.status_code == 201
        snap1_id = comp_res.json()["snapshot_id"]

        # 5. Search the extracted documentation
        search_res = await client.get("/api/v1/search?q=FastAPI", headers=headers)
        assert search_res.status_code == 200
        search_data = search_res.json()
        assert search_data["total"] >= 1
        assert "FastAPI Framework" in search_data["results"][0]["title"]
        assert search_data["results"][0]["canonical_url"] == source_url

        # 6. Check compiled artifacts: llms.txt, llms-full.txt, AGENTS.md, SKILL.md
        art_res = await client.get(f"/api/v1/sources/{source_id}/artifacts", headers=headers)
        assert art_res.status_code == 200
        artifacts = {a["artifact_type"] for a in art_res.json()}
        assert "llms_txt" in artifacts
        assert "llms_full_txt" in artifacts
        assert "agents_md" in artifacts
        assert "skill_md" in artifacts

        llms_content = await client.get(
            f"/api/v1/sources/{source_id}/artifacts/llms_txt", headers=headers
        )
        assert llms_content.status_code == 200
        assert "FastAPI Official Documentation" in llms_content.text

        # 7. Check Prometheus metrics endpoint
        metrics_res = await client.get("/api/v1/metrics")
        assert metrics_res.status_code == 200
        assert "devknowledge_sources_total" in metrics_res.text
        assert "devknowledge_pages_indexed_total" in metrics_res.text

        # 8. Check Manifest endpoint
        man_res = await client.get(f"/api/v1/sources/{source_id}/manifest", headers=headers)
        assert man_res.status_code == 200
        assert man_res.json()["snapshot_id"] == snap1_id
