# Replicator vocabulary

Short definitions for terms used throughout `meditate`'s `SKILL.md`. Written
for anyone installing this plugin standalone — no external design doc
required to follow the cycle.

## gene

A tracked skill or capability (a plugin's skill, or the plugin as a whole)
that the replicator's ledger (`ledger.json`) maintains usage stats and
lifecycle state for. Genes start out either `preexisting` (seeded from
`claude plugin list` on the first-ever run) or get `register`ed when a
cycle builds something new. Each gene accumulates invocation counts,
classification (e.g. `flapping`, `seasonal-candidate`, `revived`), and can
be marked `core` (exempt from pruning) or `seasonal`.

## mute

Suppressing a gene from future pruning/removal consideration without
deleting its ledger history — done via `ledger-cli.ts mute --key <gene>
--reason <reason>`. A muted gene keeps its usage record and classification
history intact; muting just stops the prune pass from acting on it again
until conditions change (e.g. a widened `muteThresholdWeeks`, or a fresh
cycle of evidence for a `revived` gene).

## cycle

One complete run of the `meditate` skill, start to finish: ledger review,
inward meditation, outward scan, build queue, prune pass, publish, and
trace. Cycles are counted (`cycles.count`) and timestamped
(`cycles.lastRun`, `cycles.lastOutwardScan`, `cycles.lastPublish`) in the
ledger, and most steps compare against "since the last cycle" rather than
a fixed calendar window.

## watchlist

`docs/replicator/watchlist.md` — a running list of candidate skill ideas
that have been noticed (usually via Step 3's outward scan) but not yet
turned into a built skill. Each entry records the source, date, a
condensed safety narrative, and a one-line thesis. Entries sit on the
watchlist until either a matching local need shows up (routing them into
the ordinary build queue) or one is deliberately chosen as a cycle's
speculative build.

## speculative build

A skill built from a watchlist entry with no confirmed prior local need —
just a judgment call that it's likely to matter. At most one speculative
build is allowed per cycle, it requires a concrete written thesis for when
it will be needed, and it's held to a higher bar than ordinary build-queue
items: if a prior speculative pick goes 6 cycles with zero invocations,
the next speculative pick must explicitly explain what's different this
time before it's chosen again.
