# journal

Keeps a series of narrative journals about what you've been doing, written from
Claude's own perspective — built by reading session history across every Claude
Code project on this machine, plus the existing memory system.

## Skills

| Skill | Description |
|---|---|
| `update-journal` | Manually invoked. Reads session activity since the last update, judges whether it continues the current journal's cycle or starts a new one, and writes/closes entries accordingly. |

## Where journals live

Journal files are **not** stored inside this plugin. They live in the workspace
repo at `docs/journal/`, following the same personal-data-stays-out-of-plugins
convention documented in the root `CLAUDE.md` (see "Personal Data Kept Out of
Plugins") — this plugin ships only the skill and the extraction script, so it stays
portable for anyone else who installs it.

Each journal is a dated markdown file (`docs/journal/YYYY-MM-DD-<slug>.md`) with a
`status: open`/`closed` frontmatter field. A closed journal is never edited again —
it's a permanent, immutable record of that cycle.

## Install

```
/plugin install journal@cameri-skills
```

## License

MIT
