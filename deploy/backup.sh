#!/usr/bin/env bash
# Safe SQLite + uploads backup with 3-day retention.
# Run as the foxtutor user (cron does this). See deploy/README.md for restore.
set -euo pipefail

DATA_DIR="${DATA_DIR:-/var/lib/foxtutor}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/foxtutor}"
KEEP_DAYS="${KEEP_DAYS:-3}"
DB="$DATA_DIR/db.sqlite3"

# Run from a path the service user can always access (cron/manual shells may
# start in /home/ec2-user, which foxtutor cannot read).
cd /

stamp="$(date +%Y-%m-%d_%H%M%S)"
dest="$BACKUP_DIR/$stamp"
mkdir -p "$dest"

# Consistent, WAL-safe copy even while the app is running.
sqlite3 "$DB" ".backup '$dest/db.sqlite3'"

# Uploaded files.
if [ -d "$DATA_DIR/media" ]; then
    cp -a "$DATA_DIR/media" "$dest/media"
fi

# Retention: remove backups older than KEEP_DAYS days.
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +

echo "Redraft backup complete: $dest"
