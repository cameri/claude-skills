# finance-manager:manage-paperless-workflows

Creates or fixes Paperless-ngx workflows so bank statement documents get auto-tagged (correspondent, document type, processed tag) and lose the inbox tag. Applies automatically — no confirmation prompt. Use when a document is flagged as untriaged by `reconcile-statement`, or when the user asks to set up or fix a paperless workflow for a statement type.

## Intake

Gather:

1. **Correspondent** — name or ID (e.g. "Tangerine")
2. **Document type** — name or ID to assign (e.g. "Financial")
3. **Processed tag** — name or ID to assign once matched (e.g. "statement")
4. **Sample document** — an ID to validate the match against (an existing untriaged document from this correspondent is ideal)

## Routing

| Intent | Workflow |
|--------|----------|
| Create/fix a workflow for a statement type | `workflows/create-or-update-workflow.md` |

## References

- `references/workflow-template.md` — generic trigger/action pattern (portable, no concrete IDs)
- `references/troubleshooting.md` — how to read paperless-ngx container logs and a document's history API to diagnose whether a workflow fired, whether a reprocess actually changed anything, and whether an extraction-quality issue is a stale-processing artifact or inherent to the current processor. Use when a document seems untriaged/mis-tagged for no obvious reason, or before recommending a document be reprocessed.

## Personal configuration (not shipped with this plugin)

- `docs/finance/paperless-workflow-ids.md` — this workspace's correspondent/document-type/tag IDs and worked examples (RBC, Tangerine)

If this file is missing entries for the correspondent/document-type/tag you need, resolve them via the Paperless API by name (see `workflows/create-or-update-workflow.md` Step 1) and add them.

## Dependencies

- `~/.claude/channels/paperless/.env` — Paperless-ngx credentials (via `paperless:access`)
- `paperless:view-content` skill — fetch sample document content for match simulation
- `scripts/simulate_match.py` — local match validation, the sole safety gate before applying
- Telegram chat ID `7175022` — report destination when invoked headless from `reconcile-statement`
