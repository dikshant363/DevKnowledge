import asyncio
import time
from abc import ABC, abstractmethod
from typing import Dict, Optional, Tuple

import httpx
import structlog

from apps.api.app.config import Settings, get_settings

logger = structlog.get_logger()


class CacheAdapter(ABC):
    """
    Abstract cache adapter for key-value storage.
    Supports in-memory caching and serverless Upstash Redis.
    """

    @abstractmethod
    async def get(self, key: str) -> Optional[str]:
        pass

    @abstractmethod
    async def set(self, key: str, value: str, ttl_seconds: Optional[int] = None) -> bool:
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        pass


class InMemoryCacheAdapter(CacheAdapter):
    """
    Local in-memory cache with TTL support for development and fallback.
    """

    def __init__(self):
        # key -> (value, expire_timestamp_or_none)
        self._store: Dict[str, Tuple[str, Optional[float]]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[str]:
        async with self._lock:
            if key not in self._store:
                return None
            val, exp = self._store[key]
            if exp is not None and time.time() > exp:
                del self._store[key]
                return None
            return val

    async def set(self, key: str, value: str, ttl_seconds: Optional[int] = None) -> bool:
        async with self._lock:
            exp = time.time() + ttl_seconds if ttl_seconds else None
            self._store[key] = (value, exp)
            return True

    async def delete(self, key: str) -> bool:
        async with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    async def exists(self, key: str) -> bool:
        return (await self.get(key)) is not None


class UpstashRedisAdapter(CacheAdapter):
    """
    Serverless Upstash Redis adapter using HTTP REST API.
    Free tier: 10,000 commands/day, 256MB storage.
    """

    def __init__(self, rest_url: str, rest_token: str):
        self.rest_url = rest_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {rest_token}"}
        self.fallback = InMemoryCacheAdapter()

    async def get(self, key: str) -> Optional[str]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.rest_url}/get/{key}", headers=self.headers)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("result")
                return None
        except Exception as e:
            logger.warning("Upstash Redis get failed, using fallback", error=str(e), key=key)
            return await self.fallback.get(key)

    async def set(self, key: str, value: str, ttl_seconds: Optional[int] = None) -> bool:
        try:
            cmd = ["SET", key, value]
            if ttl_seconds:
                cmd.extend(["EX", str(ttl_seconds)])
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.post(self.rest_url, headers=self.headers, json=cmd)
                return res.status_code == 200
        except Exception as e:
            logger.warning("Upstash Redis set failed, using fallback", error=str(e), key=key)
            return await self.fallback.set(key, value, ttl_seconds)

    async def delete(self, key: str) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.rest_url}/del/{key}", headers=self.headers)
                return res.status_code == 200
        except Exception as e:
            logger.warning("Upstash Redis delete failed, using fallback", error=str(e), key=key)
            return await self.fallback.delete(key)

    async def exists(self, key: str) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.rest_url}/exists/{key}", headers=self.headers)
                if res.status_code == 200:
                    data = res.json()
                    return bool(data.get("result", 0))
                return False
        except Exception:
            return await self.fallback.exists(key)


_global_cache: Optional[CacheAdapter] = None


def get_cache_adapter(settings: Optional[Settings] = None) -> CacheAdapter:
    """
    Factory resolving the active cache adapter.
    Uses Upstash if credentials are configured; otherwise InMemoryCacheAdapter.
    """
    global _global_cache
    if _global_cache is None:
        cfg = settings or get_settings()
        if cfg.UPSTASH_REDIS_REST_URL and cfg.UPSTASH_REDIS_REST_TOKEN:
            _global_cache = UpstashRedisAdapter(
                rest_url=cfg.UPSTASH_REDIS_REST_URL,
                rest_token=cfg.UPSTASH_REDIS_REST_TOKEN,
            )
        else:
            _global_cache = InMemoryCacheAdapter()
    return _global_cache
