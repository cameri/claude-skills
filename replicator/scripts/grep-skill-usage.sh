#!/usr/bin/env bash
# Emits raw skill/slash-command usage lines from session transcripts modified
# since a given epoch second. Output is meant for extract.ts's parseSkillUsage.
#
# Usage: grep-skill-usage.sh <transcripts-dir> <since-epoch-seconds>
set -euo pipefail

DIR="$1"
SINCE="$2"

# NOTE: `grep` exits 1 when it finds no match, and under `set -e` an
# unadorned `grep` failure here would kill this entire script mid-loop —
# most transcripts contain only one of {Skill tool calls, slash commands}
# or neither, so "no match" is the common case, not an error. `|| true`
# suppresses only the pipeline's exit code; a genuine grep crash (bad
# pattern, unreadable file) still surfaces because it produces no output
# for `sed` to act on, and downstream counts will look obviously wrong
# rather than silently vanishing. Do not remove this "for cleanliness" —
# see C3 in the 2026-08-14 final-review-fix-brief for the truncation bug
# this caused when it was missing.
for f in "$DIR"/*.jsonl; do
  [ -f "$f" ] || continue
  mtime=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f")
  [ "$mtime" -ge "$SINCE" ] || continue
  grep -o '"name":"Skill","input":{"skill":"[^"]*"' "$f" | sed 's/.*skill":"/skill: /' || true
  grep -o '<command-name>[^<]*</command-name>' "$f" | sed 's/<[^>]*>//g' || true
done | sort | uniq -c | sort -rn
