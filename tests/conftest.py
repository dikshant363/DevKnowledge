import os

# Ensure all test runs use an isolated SQLite test database and local storage backend
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_devknowledge.db"
os.environ["DATABASE_URL_SYNC"] = "sqlite:///./test_devknowledge.db"
os.environ["STORAGE_BACKEND"] = "local"
os.environ["ENVIRONMENT"] = "testing"

from apps.api.app.config import get_settings  # noqa: E402

# Clear cached settings so new env vars take effect
get_settings.cache_clear()
