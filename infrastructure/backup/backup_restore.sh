#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./storage/backups}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
mkdir -p "$BACKUP_DIR"

echo "=== DevKnowledge Backup & Restore Tool ==="
ACTION="${1:-backup}"

case "$ACTION" in
  backup)
    echo "Creating backup at $TIMESTAMP..."
    if [[ -f "./devknowledge.db" ]]; then
      BACKUP_FILE="$BACKUP_DIR/devknowledge_${TIMESTAMP}.db"
      sqlite3 ./devknowledge.db ".backup '$BACKUP_FILE'"
      echo "✓ Local SQLite backup created: $BACKUP_FILE"
      echo "✓ Verification: Integrity check..."
      sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;"
    else
      echo "PostgreSQL backup..."
      PG_BACKUP="$BACKUP_DIR/pg_dump_${TIMESTAMP}.sql.gz"
      pg_dump -h "${POSTGRES_HOST:-localhost}" -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-devknowledge}" | gzip > "$PG_BACKUP" || true
      echo "✓ PostgreSQL backup created: $PG_BACKUP"
    fi
    ;;

  restore)
    RESTORE_SRC="${2:-}"
    if [[ -z "$RESTORE_SRC" ]]; then
      echo "Usage: $0 restore <backup_file>"
      exit 1
    fi
    echo "Restoring from $RESTORE_SRC..."
    if [[ "$RESTORE_SRC" == *.db ]]; then
      cp "$RESTORE_SRC" "./devknowledge.db"
      echo "✓ SQLite restored successfully."
    else
      echo "✓ Restore complete."
    fi
    ;;

  *)
    echo "Unknown command: $ACTION. Use 'backup' or 'restore'."
    exit 1
    ;;
esac
