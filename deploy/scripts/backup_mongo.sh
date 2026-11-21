#!/usr/bin/env bash
# Daily MongoDB backup for Adroit. Install: see DEPLOYMENT.md step 9.
set -euo pipefail

BACKUP_DIR=/var/backups/adroit
KEEP_DAYS=14
ENV_FILE=/opt/adroit/backend/.env

MONGO_URL=$(grep -E '^MONGO_URL=' "$ENV_FILE" | cut -d= -f2-)
STAMP=$(date +%F-%H%M)

mkdir -p "$BACKUP_DIR"
mongodump --uri="$MONGO_URL" --gzip --archive="$BACKUP_DIR/adroit-$STAMP.archive.gz"
find "$BACKUP_DIR" -name 'adroit-*.archive.gz' -mtime +"$KEEP_DAYS" -delete
echo "Backup written: $BACKUP_DIR/adroit-$STAMP.archive.gz"
