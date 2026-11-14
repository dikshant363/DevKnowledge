import asyncio
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

import structlog

from apps.api.app.config import Settings, get_settings

logger = structlog.get_logger()


class StorageBackend(ABC):
    """
    Abstract interface for durable storage.
    Supports Local filesystem and Cloudflare R2 (S3-compatible).
    """

    @abstractmethod
    async def put_object(self, key: str, data: bytes | str, content_type: str = "text/plain") -> str:
        """Store an object at the given key and return its storage URI or path."""
        pass

    @abstractmethod
    async def get_object(self, key: str) -> bytes:
        """Retrieve an object's bytes by key."""
        pass

    @abstractmethod
    async def delete_object(self, key: str) -> bool:
        """Delete an object by key."""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check whether an object exists."""
        pass

    @abstractmethod
    async def get_total_usage_bytes(self) -> int:
        """Return total stored bytes."""
        pass


class LocalStorageBackend(StorageBackend):
    """
    Local filesystem storage for offline, development, and fallback runtimes.
    """

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or get_settings().ARTIFACTS_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def put_object(self, key: str, data: bytes | str, content_type: str = "text/plain") -> str:
        clean_key = key.lstrip("/")
        target_path = self.base_dir / clean_key
        target_path.parent.mkdir(parents=True, exist_ok=True)

        if isinstance(data, str):
            payload = data.encode("utf-8")
        else:
            payload = data

        await asyncio.to_thread(target_path.write_bytes, payload)
        return str(target_path)

    async def get_object(self, key: str) -> bytes:
        p = Path(key)
        if p.is_absolute() and p.exists():
            return await asyncio.to_thread(p.read_bytes)
        clean_key = key.lstrip("/")
        target_path = self.base_dir / clean_key
        if not target_path.exists():
            raise FileNotFoundError(f"Storage object not found: {key}")
        return await asyncio.to_thread(target_path.read_bytes)

    async def delete_object(self, key: str) -> bool:
        p = Path(key)
        if p.is_absolute() and p.exists():
            await asyncio.to_thread(p.unlink)
            return True
        clean_key = key.lstrip("/")
        target_path = self.base_dir / clean_key
        if target_path.exists():
            await asyncio.to_thread(target_path.unlink)
            return True
        return False

    async def exists(self, key: str) -> bool:
        p = Path(key)
        if p.is_absolute():
            return p.exists()
        clean_key = key.lstrip("/")
        target_path = self.base_dir / clean_key
        return target_path.exists()

    async def get_total_usage_bytes(self) -> int:
        def calculate_size():
            total = 0
            if self.base_dir.exists():
                for root, _, files in os.walk(self.base_dir):
                    for f in files:
                        total += os.path.getsize(os.path.join(root, f))
            return total

        return await asyncio.to_thread(calculate_size)


class R2StorageBackend(StorageBackend):
    """
    Cloudflare R2 storage backend using standard S3 protocol.
    Free tier: 10 GB storage, 1M Class A operations/month, 10M Class B operations/month.
    """

    def __init__(
        self,
        account_id: Optional[str] = None,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        endpoint_url: Optional[str] = None,
    ):
        settings = get_settings()
        self.account_id = account_id or settings.R2_ACCOUNT_ID
        self.access_key_id = access_key_id or settings.R2_ACCESS_KEY_ID
        self.secret_access_key = secret_access_key or settings.R2_SECRET_ACCESS_KEY
        self.bucket_name = bucket_name or settings.R2_BUCKET_NAME

        if endpoint_url:
            self.endpoint_url = endpoint_url
        elif self.account_id:
            self.endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"
        else:
            self.endpoint_url = settings.R2_ENDPOINT_URL or "https://r2.cloudflarestorage.com"

        self._client = None

    def _get_client(self):
        if self._client is None:
            import boto3
            from botocore.config import Config

            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
                region_name="auto",
            )
        return self._client

    async def put_object(self, key: str, data: bytes | str, content_type: str = "text/plain") -> str:
        clean_key = key.lstrip("/")
        payload = data.encode("utf-8") if isinstance(data, str) else data

        def _upload():
            client = self._get_client()
            client.put_object(
                Bucket=self.bucket_name,
                Key=clean_key,
                Body=payload,
                ContentType=content_type,
            )
            return f"r2://{self.bucket_name}/{clean_key}"

        return await asyncio.to_thread(_upload)

    async def get_object(self, key: str) -> bytes:
        clean_key = key.lstrip("/")

        def _download():
            client = self._get_client()
            response = client.get_object(Bucket=self.bucket_name, Key=clean_key)
            return response["Body"].read()

        return await asyncio.to_thread(_download)

    async def delete_object(self, key: str) -> bool:
        clean_key = key.lstrip("/")

        def _delete():
            client = self._get_client()
            client.delete_object(Bucket=self.bucket_name, Key=clean_key)
            return True

        return await asyncio.to_thread(_delete)

    async def exists(self, key: str) -> bool:
        clean_key = key.lstrip("/")

        def _exists():
            client = self._get_client()
            try:
                client.head_object(Bucket=self.bucket_name, Key=clean_key)
                return True
            except Exception:
                return False

        return await asyncio.to_thread(_exists)

    async def get_total_usage_bytes(self) -> int:
        def _list_size():
            client = self._get_client()
            total = 0
            paginator = client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=self.bucket_name):
                for obj in page.get("Contents", []):
                    total += obj.get("Size", 0)
            return total

        try:
            return await asyncio.to_thread(_list_size)
        except Exception as e:
            logger.warning("Could not calculate R2 total usage", error=str(e))
            return 0


def get_storage_backend(settings: Optional[Settings] = None) -> StorageBackend:
    """
    Factory resolving the active storage backend.
    Supports Local, Cloudflare R2, Supabase Storage (S3-compatible), and standard S3.
    """
    cfg = settings or get_settings()
    backend_type = cfg.STORAGE_BACKEND.lower()
    if (
        backend_type in ("r2", "s3", "supabase")
        and cfg.R2_ACCESS_KEY_ID
        and cfg.R2_SECRET_ACCESS_KEY
    ):
        return R2StorageBackend(
            account_id=cfg.R2_ACCOUNT_ID,
            access_key_id=cfg.R2_ACCESS_KEY_ID,
            secret_access_key=cfg.R2_SECRET_ACCESS_KEY,
            bucket_name=cfg.R2_BUCKET_NAME,
            endpoint_url=cfg.R2_ENDPOINT_URL,
        )
    return LocalStorageBackend(base_dir=cfg.ARTIFACTS_DIR)
