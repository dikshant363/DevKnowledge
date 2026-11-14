from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    SECRET_KEY: str = "dev-insecure-secret-key-replace-in-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = "sqlite+aiosqlite:///./devknowledge.db"
    DATABASE_URL_SYNC: str = "sqlite:///./devknowledge.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    MAX_PAGES_PER_SOURCE: int = 1000
    MAX_CONCURRENT_REQUESTS: int = 5
    REQUEST_TIMEOUT_SECONDS: int = 15
    PLAYWRIGHT_HEADLESS: bool = True
    ALLOW_PRIVATE_IPS: bool = False

    # Storage Backend Configuration (Local or Cloudflare R2)
    STORAGE_BACKEND: str = "local"  # "local" or "r2"
    ARTIFACTS_DIR: str = "./storage/artifacts"
    EXPORT_DIR: str = "./storage/exports"
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: str = "devknowledge-artifacts"
    R2_ENDPOINT_URL: Optional[str] = None
    R2_PUBLIC_URL: Optional[str] = None

    # Upstash Redis Configuration (Optional Serverless Redis)
    UPSTASH_REDIS_REST_URL: Optional[str] = None
    UPSTASH_REDIS_REST_TOKEN: Optional[str] = None

    # GitHub Actions Integration (Free Crawler Execution)
    GITHUB_ACTIONS_TOKEN: Optional[str] = None
    GITHUB_REPOSITORY: Optional[str] = None  # e.g., "owner/devknowledge"
    RUNNER_API_KEY: str = "dev-runner-api-key"

    # Durable Job Queue Parameters
    MAX_JOB_ATTEMPTS: int = 3
    JOB_LEASE_SECONDS: int = 600
    JOB_HEARTBEAT_INTERVAL_SECONDS: int = 60

    # Free-Tier Quota & Safeguards
    FREE_TIER_MAX_STORAGE_MB: int = 500  # Neon free tier database storage
    FREE_TIER_MAX_R2_STORAGE_GB: int = 10  # Cloudflare R2 free tier storage
    FREE_TIER_MAX_DAILY_REQUESTS: int = 100000  # Cloudflare Workers daily requests
    FREE_TIER_MAX_GITHUB_MINUTES: int = 2000  # GitHub Actions free tier minutes/month
    FREE_TIER_PAUSE_ON_OVERQUOTA: bool = True

    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
