---
name: manage-paperless-workflows
description: Creates or fixes Paperless-ngx workflows so bank statement documents get auto-tagged (correspondent, document type, processed tag) and lose the inbox tag. Applies automatically — no confirmation prompt. Use when a document is flagged as untriaged by `reconcile-statement`, or when the user asks to set up or fix a paperless workflow for a statement type.
---

<objective>
Creates or fixes Paperless-ngx workflows so bank statement documents get auto-tagged
(correspondent, document type, processed tag) and lose the inbox tag — applied
automatically once a match is validated, so `reconcile-statement` never has to triage the
same institution's documents by hand twice.
</objective>

<quick_start>
Untriaged document or "set up/fix a workflow for <institution>" → follow
`workflows/create-or-update-workflow.md`: gather correspondent/document-type/tag plus a
sample document, validate candidate match text with `scripts/simulate_match.py`, then
apply.
</quick_start>

<intake>
Gather:

1. **Correspondent** — name or ID (e.g. "Acme Bank")
2. **Document type** — name or ID to assign (e.g. "Financial")
3. **Processed tag** — name or ID to assign once matched (e.g. "statement")
4. **Sample document** — an ID to validate the match against (an existing untriaged
   document from this correspondent is ideal)
</intake>

<routing>
| Intent | Workflow |
|--------|----------|
| Create/fix a workflow for a statement type | `workflows/create-or-update-workflow.md` |
</routing>

<reference_index>
- `references/workflow-template.md` — generic trigger/action pattern (portable, no
  concrete IDs)
- `references/troubleshooting.md` — how to read paperless-ngx container logs and a
  document's history API to diagnose whether a workflow fired, whether a reprocess
  actually changed anything, and whether an extraction-quality issue is a
  stale-processing artifact or inherent to the current processor. Use when a document
  seems untriaged/mis-tagged for no obvious reason, or before recommending a document be
  reprocessed.
</reference_index>

<personal_configuration>
- `docs/finance/paperless-workflow-ids.md` — this workspace's
  correspondent/document-type/tag IDs and worked examples

If this file is missing entries for the correspondent/document-type/tag you need, resolve
them via the Paperless API by name (see `workflows/create-or-update-workflow.md` Step 1)
and add them.
</personal_configuration>

<dependencies>
- `~/.claude/channels/paperless/.env` — Paperless-ngx credentials (via
  `paperless:access`)
- `paperless:view-content` skill — fetch sample document content for match simulation
- `scripts/simulate_match.py` — local match validation, the sole safety gate before
  applying
- `config.json`'s `reporting.telegram_chat_id` — report destination when invoked headless
  from `reconcile-statement`; ask the user for one if unset
</dependencies>

<success_criteria>
- Nothing is applied until `scripts/simulate_match.py` exits 0 on a real sample document
- If no candidate match validates, nothing is written — abort and report rather than guess
- Inbox tag ID resolved dynamically from the Paperless API — never hardcoded
- Report states the exact workflow/trigger/IDs applied (transparency in place of a
  confirmation prompt)
</success_criteria>
