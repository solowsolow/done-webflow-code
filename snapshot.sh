#!/bin/bash
# snapshot.sh — rolling backup przed edycją.
# Kopiuje aktualny plik do .backups/<nazwa>/<timestamp>.bak
# i przycina katalog do 3 najnowszych kopii.
#
# Użycie: ./snapshot.sh path/to/file.js
# Wywoływane automatycznie przed każdym Edit/Write przez Claude'a.

set -e

if [ -z "$1" ]; then
  echo "usage: $0 <file>" >&2
  exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
REL_PATH="${FILE#$REPO_ROOT/}"
SAFE_NAME="$(echo "$REL_PATH" | tr '/' '_')"
BACKUP_DIR="$REPO_ROOT/.backups/$SAFE_NAME"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
cp "$FILE" "$BACKUP_DIR/$TIMESTAMP.bak"

# Zostaw tylko 3 najnowsze (sortowanie po nazwie = chronologiczne dzięki timestamp format).
ls -1 "$BACKUP_DIR" | sort | head -n -3 | while read OLD; do
  rm "$BACKUP_DIR/$OLD"
done
