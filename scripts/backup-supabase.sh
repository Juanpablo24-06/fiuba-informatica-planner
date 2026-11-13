#!/usr/bin/env bash

set -euo pipefail

backup_root="${SUPABASE_BACKUP_DIR:-/home/juan/Backups/fiuba-informatica}"
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="$backup_root/$timestamp"

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker no está disponible; creando respaldo portable de tablas y migraciones."
  node scripts/backup-supabase-data.mjs "$backup_dir"
  find "$backup_dir" -type d -exec chmod 700 {} +
  find "$backup_dir" -type f -exec chmod 600 {} +
  echo "Backup terminado: $backup_dir"
  exit 0
fi

echo "Creando backup de esquema en: $backup_dir/schema.sql"
npx --yes supabase@2.112.0 db dump \
  --linked \
  -f "$backup_dir/schema.sql"

echo "Creando backup de datos en: $backup_dir/data.sql"
npx --yes supabase@2.112.0 db dump \
  --linked \
  --data-only \
  --use-copy \
  -f "$backup_dir/data.sql"

chmod 600 "$backup_dir/schema.sql" "$backup_dir/data.sql"
sha256sum "$backup_dir/schema.sql" "$backup_dir/data.sql" \
  > "$backup_dir/checksums.txt"
chmod 600 "$backup_dir/checksums.txt"

echo "Backup terminado: $backup_dir"
