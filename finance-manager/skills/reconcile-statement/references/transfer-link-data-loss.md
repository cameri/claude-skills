Full reproduction detail behind the ⚠️ Danger note in `workflows/reconcile-statement.md`
(Step 7b, "For transfer linkages"). The distilled rule lives in the workflow; this file
preserves the evidence trail so the risk stays auditable.

**Incident — reproduced and refined 2026-07-22**

Setting `transfer_id` this way on a transaction that has a non-null `imported_id` (i.e. it
came from live bank-sync, not a manual/backfill insert) can silently **delete the
transaction** rather than link it — confirmed by watching two real, `cleared: true`,
bank-synced transactions vanish entirely (not just left unlinked) immediately after this
exact update pattern, with the account balance dropping by exactly their combined amount.
A fresh bank-sync on the affected account restored them (new transaction ids, same
amounts/dates) with balance correctly recovered — that's the fix if this happens to you.

Root cause unconfirmed, but same-day follow-up testing narrowed the trigger: the deletion
only reproduced when **both** sides of the pair had a non-null `imported_id` (both
live-synced). Linking one live-synced side to one manually-inserted side (no
`imported_id`) — the normal shape of linking a fresh backfill transaction to pre-existing
bank-synced data — worked correctly across every link made today, including 7 more done
later the same day using this exact one-side-synced pattern, deliberately tested one pair
first with an immediate balance check before doing the rest.

**Rule**

Only worry about this when *both* sides of a candidate transfer already exist as
live-synced data. In that case, don't link via this CLI update pattern — leave it unlinked
(transfer-shaped payee, no category, same as the "not found" case) or use ActualBudget's
own UI instead. If you do need to link two already-synced transactions this way despite
the risk, test with a single pair first and verify the account balance is unchanged
immediately after, before doing the rest.

**Re-confirmation — 2026-07-26**

6 more pairs, all one-side-synced (manual backfill insert ↔ pre-existing live-synced
counterpart): balances stayed correct throughout, no deletions. But this is exactly where
the CLI's "flush after every single write" requirement (see `cli-setup.md`) bites hardest,
because linking one pair takes *two* sequential `transactions update` calls (side A, then
side B) — running both before flushing applies only the first and silently no-ops the
second (it errors "unknown problem opening" but the earlier call's write still went
through). Flush after `transactions update`, not just after `transactions add` — one call,
one flush, every time, for every side of every pair.
