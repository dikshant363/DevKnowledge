from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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

    ARTIFACTS_DIR: str = "./storage/artifacts"
    EXPORT_DIR: str = "./storage/exports"

    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
