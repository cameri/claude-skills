#!/usr/bin/env bash
# Emits raw skill/slash-command usage lines from session transcripts modified
# since a given epoch second. Output is meant for extract.ts's parseSkillUsage.
#
# Usage: grep-skill-usage.sh <transcripts-dir> <since-epoch-seconds>
#
# Supports two transcript formats, auto-detected from the first transcript in
# the directory:
#   - Claude Code (default): skill activation is the Skill tool's input JSON
#     (`"name":"Skill","input":{"skill":"X"}`) and slash commands are recorded
#     as `<command-name>` tags.
#   - omp (pi/omp agent, e.g. ~/.omp-agent/sessions/--workspace--): skill
#     activation is a `read` toolCall whose arguments.path is `skill://<name>`.
#     omp records no structural slash-command events — the `<command-name>` tags
#     in its transcripts are embedded tool output, not events — so the omp
#     branch emits only skill activations.
set -euo pipefail

DIR="$1"
SINCE="$2"

# Detect the format from the first transcript file. omp toolCall blocks carry
# the omp-specific "type": "toolCall" marker (Claude content blocks use
# "type":"tool_use"); ` *` tolerates both compact and pretty-printed spacing.
OMP=0
for f in "$DIR"/*.jsonl; do
  [ -f "$f" ] || continue
  if grep -q '"type": *"toolCall"' "$f" 2>/dev/null; then
    OMP=1
  fi
  break
done

if [ "$OMP" = "1" ]; then
  # omp: structural extraction. The transcripts embed a lot of non-event text
  # that also contains `skill://` (past skill content, tool output, the agent's
  # own notes), so a bare grep would massively over-count. Instead we parse each
  # JSONL line and keep only genuine `read` toolCall blocks whose arguments.path
  # is a skill URI. Subpaths (/SKILL.md, /workflows/x.md) collapse to the skill
  # name, and the one namespaced form skill://<plugin>/<skill> is emitted as
  # plugin:skill to match the ledger's gene-key convention. Requires python3,
  # which is present on the omp runtime.
  python3 - "$DIR" "$SINCE" <<'PY'
import json
import os
import sys
from collections import Counter

dirpath, since = sys.argv[1], int(sys.argv[2])
out = []
for name in sorted(os.listdir(dirpath)):
    if not (name.endswith('.jsonl') and os.path.isfile(os.path.join(dirpath, name))):
        continue
    path = os.path.join(dirpath, name)
    try:
        if os.path.getmtime(path) < since:
            continue
    except OSError:
        continue
    try:
        with open(path, 'r', errors='replace') as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    o = json.loads(line)
                except json.JSONDecodeError:
                    continue
                msg = o.get('message')
                if not isinstance(msg, dict):
                    continue
                content = msg.get('content')
                if not isinstance(content, list):
                    continue
                for c in content:
                    if not isinstance(c, dict) or c.get('type') != 'toolCall':
                        continue
                    if c.get('name') != 'read':
                        continue
                    args = c.get('arguments')
                    p = args.get('path') if isinstance(args, dict) else None
                    if not isinstance(p, str) or not p.startswith('skill://'):
                        continue
                    rest = p[len('skill://'):]
                    segs = rest.split('/')
                    if len(segs) == 1:
                        skill = segs[0]
                    elif len(segs) == 2 and '.' not in segs[1] and segs[1] != 'SKILL.md':
                        # skill://<plugin>/<skill> -> plugin:skill
                        skill = f'{segs[0]}:{segs[1]}'
                    else:
                        # skill://<skill>/<subpath...> -> <skill>
                        skill = segs[0]
                    if skill:
                        out.append(skill)
    except OSError:
        continue

for skill, n in Counter(out).most_common():
    print(f'{n:5d} skill: {skill}')
PY
  exit 0
fi

# Claude Code: Skill tool JSON + <command-name> tags. NOTE: `grep` exits 1 when
# it finds no match, and under `set -e` an unadorned `grep` failure here would
# kill this entire script mid-loop — most transcripts contain only one of
# {Skill tool calls, slash commands} or neither, so "no match" is the common
# case, not an error. `|| true` suppresses only the pipeline's exit code; a
# genuine grep crash (bad pattern, unreadable file) still surfaces because it
# produces no output for `sed` to act on, and downstream counts will look
# obviously wrong rather than silently vanishing. Do not remove this "for
# cleanliness" — see C3 in the 2026-08-14 final-review-fix-brief for the
# truncation bug this caused when it was missing.
for f in "$DIR"/*.jsonl; do
  [ -f "$f" ] || continue
  mtime=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f")
  [ "$mtime" -ge "$SINCE" ] || continue
  grep -o '"name":"Skill","input":{"skill":"[^"]*"' "$f" | sed 's/.*skill":"/skill: /' || true
  grep -o '<command-name>[^<]*</command-name>' "$f" | sed 's/<[^>]*>//g' || true
done | sort | uniq -c | sort -rn
