#!/usr/bin/env bash
# Reports broken relative markdown links and orphaned pages under a wiki directory.
# Usage: check-wiki.sh <wiki-dir>
set -euo pipefail

WIKI_DIR="${1:?usage: check-wiki.sh <wiki-dir>}"

if [ ! -d "$WIKI_DIR" ]; then
  echo "No such directory: $WIKI_DIR"
  exit 0
fi

echo "== Broken links =="
broken=0
while IFS= read -r -d '' page; do
  dir=$(dirname "$page")
  while IFS= read -r link; do
    target=$(printf '%s' "$link" | sed -E 's/^\[[^]]*\]\(([^)]+)\)$/\1/')
    target="${target%%#*}"
    [ -z "$target" ] && continue
    resolved="$dir/$target"
    if [ ! -f "$resolved" ]; then
      echo "  $page -> $target (missing)"
      broken=$((broken + 1))
    fi
  done < <(grep -oE '\[[^]]*\]\([^)]+\.md[^)]*\)' "$page" || true)
done < <(find "$WIKI_DIR" -name '*.md' -print0)
[ "$broken" -eq 0 ] && echo "  (none)"

echo
echo "== Orphaned pages (no incoming links, excluding index.md) =="
orphans=0
while IFS= read -r -d '' page; do
  base=$(basename "$page")
  [ "$base" = "index.md" ] && continue
  hit=$(grep -rlE "\]\([^)]*$base\)" "$WIKI_DIR" --include='*.md' 2>/dev/null | grep -v -F "$page" || true)
  if [ -z "$hit" ]; then
    echo "  $page"
    orphans=$((orphans + 1))
  fi
done < <(find "$WIKI_DIR" -name '*.md' -print0)
[ "$orphans" -eq 0 ] && echo "  (none)"
