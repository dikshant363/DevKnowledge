import asyncio

import pytest

from apps.api.app.cache.adapter import InMemoryCacheAdapter, UpstashRedisAdapter, get_cache_adapter
from apps.api.app.config import Settings


@pytest.mark.asyncio
async def test_in_memory_cache_operations():
    cache = InMemoryCacheAdapter()

    # Set and get
    await cache.set("greeting", "hello world", ttl_seconds=10)
    val = await cache.get("greeting")
    assert val == "hello world"

    # Exists
    assert await cache.exists("greeting") is True
    assert await cache.exists("unknown") is False

    # Delete
    deleted = await cache.delete("greeting")
    assert deleted is True
    assert await cache.get("greeting") is None


@pytest.mark.asyncio
async def test_in_memory_cache_expiration():
    cache = InMemoryCacheAdapter()
    await cache.set("quick_key", "expires_soon", ttl_seconds=1)
    assert await cache.get("quick_key") == "expires_soon"

    await asyncio.sleep(1.1)
    assert await cache.get("quick_key") is None


def test_cache_adapter_factory():
    settings = Settings(UPSTASH_REDIS_REST_URL=None, UPSTASH_REDIS_REST_TOKEN=None)
    adapter = get_cache_adapter(settings)
    assert isinstance(adapter, (InMemoryCacheAdapter, UpstashRedisAdapter))
