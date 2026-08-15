#!/usr/bin/env bash
# Emits raw skill/slash-command usage lines from session transcripts modified
# since a given epoch second. Output is meant for extract.ts's parseSkillUsage.
#
# Usage: grep-skill-usage.sh <transcripts-dir> <since-epoch-seconds>
set -euo pipefail

DIR="$1"
SINCE="$2"

for f in "$DIR"/*.jsonl; do
  [ -f "$f" ] || continue
  mtime=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f")
  [ "$mtime" -ge "$SINCE" ] || continue
  grep -o '"name":"Skill","input":{"skill":"[^"]*"' "$f" | sed 's/.*skill":"/skill: /'
  grep -o '<command-name>[^<]*</command-name>' "$f" | sed 's/<[^>]*>//g'
done | sort | uniq -c | sort -rn
