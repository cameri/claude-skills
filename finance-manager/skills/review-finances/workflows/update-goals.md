# Workflow: update-goals

<required_reading>
`docs/finance/rich-life-goals.md`
</required_reading>

<process>
## Step 1 — Determine the change

Ask (unless already clear from how the user asked):
- **Add a goal** — name, target amount (CAD), target date, funding account (if one
  exists in `~/.claude/channels/finance-manager/config.json`)
- **Edit a goal** — which goal, what's changing (target amount, date, funding account)
- **Close a goal** — which goal, and whether it was fully funded/achieved or abandoned

## Step 2 — Apply the change

- **Add:** append a row to the Active Goals table. Current starts at whatever the funding
  account's actual balance is right now (query Actual Budget if a funding account is
  named), not $0, unless the goal is genuinely brand new.
- **Edit:** update the relevant cell(s) in place. Don't touch Current — that's only ever
  updated by `run-review.md`'s Step 4, to avoid the two workflows disagreeing about
  freshness.
- **Close:** move the row from Active Goals to Closed Goals, adding the closure date and
  outcome (achieved on time / achieved late / abandoned).

## Step 3 — Confirm

Show the user the updated Active Goals table (or the closed row) and confirm it's
correct before considering the workflow done.
</process>

<success_criteria>
- `docs/finance/rich-life-goals.md` table structure stays intact (same columns, same
  format) so `run-review.md` can parse it without special-casing
- No goal silently disappears — closed goals are archived, not deleted
</success_criteria>
