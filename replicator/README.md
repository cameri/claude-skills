# Replicator

Grows and prunes this Claude Code instance's own skill set. During the day,
`/replicator:capture` queues things worth turning into skills. Every night,
`/replicator:meditate` reviews how existing skills were used, looks inward
at recent sessions and outward at frontier sources for skills that would
have helped, builds what survives scrutiny, and mutes or flags for removal
what's gone stale — always with a written trace, never silently.

Full design: `docs/superpowers/specs/2026-08-14-replicator-design.md`
(workspace repo — this plugin's own repo stays portable and doesn't ship
that instance-specific document).

**Phase 1**: capture → meditate cycle, usage-based pruning, injection
defense for outward-scan content. **Phase 2** (this release): a public
registry of this replicator's genes, published weekly over Nostr (gene
and list records signed under its own identity) and mirrored to a GitHub
gist (a flat, always-current snapshot rather than per-event records —
gists have no replaceable-event persistence of their own). **Not built yet**:
cross-replicator voting and adopting skills authored by other
replicators — phase 1's structures (the gene ledger, the watchlist, the
no-source-code rule, the rewrite-never-copy discipline) are built so that
plugs in without rework.

## Install

```
/plugin install replicator@cameri-skills
/reload-plugins
```

## Vocabulary

A skill is a **gene**. Disabling one is **muting** it. The nightly pass is
a **cycle**. The plugin as a whole is the **replicator**.
