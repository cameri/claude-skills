# knowledge-wiki Plugin Configuration

This file is the authoritative source for environment-specific values used by the knowledge-wiki skills.
Update this file when your wiki repo's location changes — skills read from here at runtime instead of hardcoding paths.

## Wiki Repo

| Value | Path |
|-------|------|
| `WIKI_ROOT` — wiki repo root (standalone git repo holding the wiki pages) | `/workspace/docs` |

Wiki pages live at `$WIKI_ROOT/wiki/`. The maintain-wiki skill references this
value in commands: `git -C "$WIKI_ROOT"` for commits/pushes, and
`scripts/check-wiki.sh "$WIKI_ROOT/wiki"` for the consistency check.
