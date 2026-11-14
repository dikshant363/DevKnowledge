#!/usr/bin/env bash
set -euo pipefail

# DevKnowledge Free-Cloud Zero-Cost Backup & Disaster Recovery Tool
# Supports Neon PostgreSQL and SQLite backups with Cloudflare R2 archiving

BACKUP_DIR="${BACKUP_DIR:-./storage/backups}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
mkdir -p "$BACKUP_DIR"

command="${1:-backup}"

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

backup_postgres() {
    local db_url="${DATABASE_URL_SYNC:-${DATABASE_URL:-}}"
    local target_file="${BACKUP_DIR}/devknowledge_pg_${TIMESTAMP}.sql.gz"

    if [[ -z "$db_url" || "$db_url" == sqlite* ]]; then
        log "Skipping PostgreSQL backup (DATABASE_URL is SQLite or empty)"
        return 0
    fi

    log "Starting Neon PostgreSQL backup..."
    pg_dump "$db_url" --no-owner --no-privileges | gzip > "$target_file"

    local checksum
    checksum=$(shasum -a 256 "$target_file" | awk '{print $1}')
    echo "$checksum" > "${target_file}.sha256"
    log "✓ PostgreSQL backup created: $target_file (SHA-256: $checksum)"

    upload_to_r2 "$target_file"
}

backup_sqlite() {
    local target_file="${BACKUP_DIR}/devknowledge_sqlite_${TIMESTAMP}.db"
    local db_path="./devknowledge.db"

    if [[ ! -f "$db_path" ]]; then
        log "SQLite database not found at $db_path, skipping."
        return 0
    fi

    log "Backing up local SQLite database..."
    sqlite3 "$db_path" ".backup '$target_file'"

    log "Verifying SQLite integrity..."
    local check
    check=$(sqlite3 "$target_file" "PRAGMA integrity_check;")
    if [[ "$check" == "ok" ]]; then
        log "✓ SQLite backup integrity verified: ok"
        local checksum
        checksum=$(shasum -a 256 "$target_file" | awk '{print $1}')
        echo "$checksum" > "${target_file}.sha256"
        upload_to_r2 "$target_file"
    else
        log "✗ Integrity check failed: $check"
        exit 1
    fi
}

upload_to_r2() {
    local file_to_upload="$1"
    local r2_bucket="${R2_BUCKET_NAME:-devknowledge-artifacts}"

    if [[ -n "${R2_ACCESS_KEY_ID:-}" && -n "${R2_SECRET_ACCESS_KEY:-}" ]]; then
        log "Uploading backup archive to Cloudflare R2 bucket: $r2_bucket..."
        python3 - <<EOF
import os, asyncio
from apps.api.app.storage.backend import R2StorageBackend

async def upload():
    backend = R2StorageBackend(
        account_id=os.getenv("R2_ACCOUNT_ID"),
        access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
        secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
        bucket_name="$r2_bucket",
        endpoint_url=os.getenv("R2_ENDPOINT_URL")
    )
    with open("$file_to_upload", "rb") as f:
        data = f.read()
    filename = os.path.basename("$file_to_upload")
    loc = await backend.put_object(f"backups/{filename}", data, "application/octet-stream")
    print(f"✓ Uploaded backup to R2: {loc}")

asyncio.run(upload())
EOF
    else
        log "R2 credentials not set. Backup preserved securely on local storage: $file_to_upload"
    fi
}

case "$command" in
    backup)
        log "=== DevKnowledge Zero-Cost Backup Initiated ==="
        backup_postgres
        backup_sqlite
        log "=== Backup Routine Completed Successfully ==="
        ;;
    restore)
        local restore_source="${2:-}"
        if [[ -z "$restore_source" || ! -f "$restore_source" ]]; then
            echo "Usage: $0 restore <backup_file>"
            exit 1
        fi
        log "Restoring from $restore_source..."
        if [[ "$restore_source" == *.sql.gz ]]; then
            gunzip -c "$restore_source" | psql "${DATABASE_URL_SYNC:-$DATABASE_URL}"
        else
            cp "$restore_source" "./devknowledge.db"
        fi
        log "✓ Restoration complete."
        ;;
    *)
        echo "Usage: $0 {backup|restore <file>}"
        exit 1
        ;;
esac
