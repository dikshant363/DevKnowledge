import os
import pytest

# Ensure all test runs use an isolated SQLite test database and local storage backend
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_devknowledge.db"
os.environ["DATABASE_URL_SYNC"] = "sqlite:///./test_devknowledge.db"
os.environ["STORAGE_BACKEND"] = "local"
os.environ["ENVIRONMENT"] = "testing"

# Clear cached settings so new env vars take effect
from apps.api.app.config import get_settings
get_settings.cache_clear()
