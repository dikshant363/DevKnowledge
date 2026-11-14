import asyncio
import os
import uuid
from typing import Optional

import httpx
import structlog

from apps.api.app.compiler.pipeline import CompilerPipeline
from apps.api.app.database.models import CrawlJob, DocumentationSource
from apps.api.app.database.session import AsyncSessionLocal
from apps.worker.crawler.engine import CrawlEngine

logger = structlog.get_logger()


class GitHubActionsCrawlerRunner:
    """
    Executes crawler and compilation jobs within ephemeral GitHub Actions runners.
    Handles authenticated job claiming, asynchronous heartbeats, execution,
    and completion/failure callbacks.
    """

    def __init__(
        self,
        api_url: Optional[str] = None,
        runner_key: Optional[str] = None,
        worker_id: Optional[str] = None,
    ):
        self.api_url = (
            api_url or os.getenv("DEVKNOWLEDGE_API_URL", "http://localhost:8000")
        ).rstrip("/")
        self.runner_key = runner_key or os.getenv("RUNNER_API_KEY", "dev-runner-api-key")
        self.worker_id = (
            worker_id or os.getenv("GITHUB_RUN_ID") or f"gha-worker-{uuid.uuid4().hex[:8]}"
        )
        self.client = httpx.AsyncClient(
            base_url=self.api_url,
            headers={"X-Runner-Key": self.runner_key, "Content-Type": "application/json"},
            timeout=30.0,
        )

    async def claim_job(self, lease_seconds: int = 600) -> Optional[dict]:
        try:
            res = await self.client.post(
                "/api/v1/jobs/claim",
                json={"worker_id": self.worker_id, "lease_seconds": lease_seconds},
            )
            if res.status_code == 200:
                data = res.json()
                return data if data else None
            logger.error("Failed to claim job from API", status_code=res.status_code, text=res.text)
            return None
        except Exception as e:
            logger.error("Network error claiming job", error=str(e))
            return None

    async def heartbeat_loop(self, job_id: str, interval_seconds: int = 30):
        """
        Periodically extends lease while crawler runs to prevent abandonment recovery.
        """
        while True:
            try:
                await asyncio.sleep(interval_seconds)
                res = await self.client.post(
                    f"/api/v1/jobs/{job_id}/heartbeat",
                    json={"worker_id": self.worker_id, "extend_seconds": 600},
                )
                if res.status_code != 200:
                    logger.warning("Heartbeat returned non-200", status=res.status_code)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning("Heartbeat transmission error", error=str(e))

    async def complete_job(self, job_id: str, pages_processed: int, pages_failed: int = 0):
        try:
            await self.client.post(
                f"/api/v1/jobs/{job_id}/complete",
                json={
                    "worker_id": self.worker_id,
                    "pages_processed": pages_processed,
                    "pages_failed": pages_failed,
                },
            )
            logger.info(
                "Reported job completion to API", job_id=job_id, pages_processed=pages_processed
            )
        except Exception as e:
            logger.error("Failed to report job completion", error=str(e))

    async def fail_job(self, job_id: str, error_message: str, error_details: Optional[str] = None):
        try:
            await self.client.post(
                f"/api/v1/jobs/{job_id}/fail",
                json={
                    "worker_id": self.worker_id,
                    "error_message": error_message,
                    "error_details": error_details,
                },
            )
            logger.info("Reported job failure to API", job_id=job_id)
        except Exception as e:
            logger.error("Failed to report job failure", error=str(e))

    async def execute_job(self, job_dict: dict) -> bool:
        job_id = job_dict["id"]
        source_id = job_dict["source_id"]
        logger.info("Starting crawler execution for job", job_id=job_id, source_id=source_id)

        # Start heartbeat background task
        heartbeat_task = asyncio.create_task(self.heartbeat_loop(job_id))
        pages_processed = 0

        try:
            async with AsyncSessionLocal() as db:
                source = await db.get(DocumentationSource, source_id)
                if not source:
                    await self.fail_job(job_id, f"Source not found: {source_id}")
                    return False

                job = await db.get(CrawlJob, job_id)
                if not job:
                    await self.fail_job(job_id, f"CrawlJob not found: {job_id}")
                    return False

                engine = CrawlEngine()
                pages_processed = await engine.crawl_source(db, source, job)

                # Automatically compile snapshot and upload artifacts
                logger.info("Compiling CKR release snapshot...", source_name=source.name)
                await CompilerPipeline.compile_source_snapshot(db, source)

            await self.complete_job(job_id, pages_processed=pages_processed)
            return True

        except Exception as e:
            logger.exception("Error executing crawl job", job_id=job_id, error=str(e))
            await self.fail_job(job_id, error_message=str(e), error_details=repr(e))
            return False

        finally:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

    async def run(self, once: bool = True):
        logger.info(
            "GitHub Actions Crawler Runner initialized",
            worker_id=self.worker_id,
            api_url=self.api_url,
        )
        job = await self.claim_job()
        if not job:
            logger.info("No pending or overdue jobs found in queue.")
            return

        success = await self.execute_job(job)
        logger.info("Job execution finished", success=success)

    async def close(self):
        await self.client.aclose()


async def main():
    runner = GitHubActionsCrawlerRunner()
    try:
        await runner.run(once=True)
    finally:
        await runner.close()


if __name__ == "__main__":
    asyncio.run(main())
