---
name: maintain-wiki
description: Use when the user shares a durable fact, how-to, spec detail, comparison, or research finding worth keeping for later rather than re-deriving next time — or asks to look something up in the personal wiki, or to check it for broken links or orphaned pages. Not for one-off facts with no future reuse, or for narrative/chronological logs (use the journal skill for those).
---

# Maintain Wiki

## Overview

A personal knowledge wiki: one markdown page per topic under `docs/wiki/`,
cross-linked by relative markdown links, updated incrementally as new
material comes in. The point is compilation, not retrieval — each ingest
folds new material into the right existing page (or a new one) so a later
query reads a synthesized page instead of re-running the original research.

`docs/` is its own standalone git repo — commit and push there with
`git -C /workspace/docs`, never `jj`.

## When to use

- User shares something worth keeping: a how-to, an API/tool fact, a
  comparison, a decision with its reasoning — anything they'd plausibly ask
  about again.
- User asks to look something up in the wiki, or "have we looked into X
  before?"
- Periodic hygiene: check for broken links or orphaned pages.

Not for: one-time facts with no reuse (put in memory instead, per this
workspace's own memory-type rules), or narrative "what happened when"
logs — that's `journal:update-journal`.

## Ingest

1. `grep -ril "<topic keywords>" docs/wiki/` to find an existing page. Reuse
   it if the topic overlaps — don't fork a near-duplicate page.
2. No match: create `docs/wiki/<kebab-topic>.md` with a one-line frontmatter
   comment (`<!-- topic: ..., updated: YYYY-MM-DD -->`) and a `# Title`.
3. Append or update a section (don't just tack on a chronological blob —
   fold new material into existing sections where it belongs, the way a
   wiki page reads as one coherent reference, not a log).
4. Add relative links (`[other topic](./other-topic.md)`) wherever the new
   content references a concept covered elsewhere. Add a link back from
   that other page too if it doesn't already reference this one.
5. Update `docs/wiki/index.md` (create it if this is the first page) with a
   one-line entry linking the new/changed page.
6. Commit: `git -C /workspace/docs add wiki/ && git -C /workspace/docs commit -m "wiki: <topic>" && git -C /workspace/docs push`.

## Query

`grep -ril "<term>" docs/wiki/` to find candidate pages, then read the
matches — a wiki page is meant to be read whole, not grepped for a single
line, since related context lives in the same page by design.

## Consistency check

Run `scripts/check-wiki.sh /workspace/docs/wiki` — reports broken relative
links (pages linked to but missing) and orphaned pages (no incoming links,
excluding `index.md`). Fix broken links by creating the missing page or
correcting the link; fix orphans by linking them from `index.md` or a
related page. Don't auto-delete anything — flag and let the user decide.

## Common mistakes

- Creating a new page when an existing one already covers the topic —
  always grep first.
- Appending new material as a dated log entry instead of integrating it
  into the page's existing structure — that's what makes this a wiki and
  not a journal.
- Forgetting the cross-link back from the referenced page.
