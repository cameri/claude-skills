# knowledge-wiki

Maintains a self-updating, cross-linked markdown knowledge base instead of
re-deriving the same research or facts every time they come up. New material
gets folded into the right existing topic page (or a new one), cross-linked
to related pages, and kept consistent over time.

## Skills

| Skill | Description |
|---|---|
| `maintain-wiki` | Ingests durable facts/research into topic pages, answers lookups against the wiki, and checks it for broken links and orphaned pages. |

## Where the wiki lives

Wiki pages are **not** stored inside this plugin — they live in the host
workspace at `docs/wiki/`, following the same personal-data-stays-out-of-plugins
convention used by other plugins in this repo (e.g. `journal`). This plugin
ships only the skill and its consistency-check script, so it stays portable
for anyone else who installs it; adjust the `docs/wiki/` path in the skill if
your own workspace stores personal reference data elsewhere.

## Install

```
/plugin install knowledge-wiki@cameri-skills
```

## License

MIT
