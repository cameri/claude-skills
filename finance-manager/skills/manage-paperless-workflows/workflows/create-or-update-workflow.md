# Workflow: create-or-update-workflow

Creates or fixes a Paperless-ngx workflow so a bank statement type gets auto-tagged. Applies automatically once the match simulation validates — no confirmation prompt. Aborts without writing anything if no candidate match text can be validated.

## Setup

```bash
set -a
source ~/.claude/channels/paperless/.env
set +a
SIMULATE="projects/claude-skills/finance-manager/skills/manage-paperless-workflows/scripts/simulate_match.py"
TOKEN=$(http --ignore-stdin -b POST "${PAPERLESS_URL%/}/api/token/" \
  username="$PAPERLESS_USERNAME" password="$PAPERLESS_PASSWORD" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
```

---

## Step 1 — Gather inputs

Need: correspondent id/name, document_type id/name, processed tag id/name, and at least one sample document ID (an existing untriaged document is ideal — same correspondent, still missing document_type or still carrying the inbox tag).

Check `docs/finance/account-map.md` and `docs/finance/paperless-workflow-ids.md` first. Resolve anything missing by name:

```bash
http --ignore-stdin -b GET "${PAPERLESS_URL%/}/api/correspondents/?name__iexact=<name>" \
  "Authorization:Token $TOKEN"
```

Fetch the sample document's content via the `paperless:view-content` skill (preferred — reuses the existing plugin) rather than a raw API call.

---

## Step 2 — Check for an existing workflow

```bash
http --ignore-stdin -b GET "${PAPERLESS_URL%/}/api/workflows/" "Authorization:Token $TOKEN" \
  | python3 -c "import sys,json; [print(w['id'], w['name']) for w in json.load(sys.stdin)['results']]"
```

If one already targets this correspondent/document-type combination (by name or by inspecting its actions' `assign_correspondent`), this is a **fix** — edit its trigger `match` field. Otherwise this is a **create** — build a new workflow from `references/workflow-template.md`.

---

## Step 3 — Simulate the match (the safety gate)

For each candidate match text (start with institution name + "Statement", add/remove distinctive words per `references/workflow-template.md`'s guidance):

```bash
python3 "$SIMULATE" "<candidate match text>" <sample_document_id>
```

- Exit `0` → this candidate is safe to use, proceed to Step 4.
- Exit `1` → try a different candidate (drop the word it named as missing, or pick different words entirely).
- Exit `2` → the script itself failed (bad arguments, missing credentials, network/API error) — this is not a 'no match' result; fix the underlying problem before treating any candidate as tried.
- If every reasonable candidate fails: **abort. Do not write anything.** Report: "Could not find a reliable match for `<correspondent>` statements — document `<sample_document_id>` needs manual review" (to the caller, or Telegram chat `7175022` if headless). This is the one case that still needs a human.

---

## Step 4 — Resolve the inbox tag dynamically

```bash
INBOX_TAG_ID=$(http --ignore-stdin -b GET "${PAPERLESS_URL%/}/api/tags/?page_size=200" \
  "Authorization:Token $TOKEN" | python3 -c "
import sys, json
tags = json.load(sys.stdin)['results']
inbox = [t for t in tags if t.get('is_inbox_tag')]
print(inbox[0]['id'] if inbox else 'NONE')
")
```

If `NONE`, this instance has no inbox tag configured — skip the `remove_tags` part of the Removal action.

---

## Step 5 — Apply automatically

**Fixing an existing workflow** — `PATCH` just the trigger(s):

```bash
http --ignore-stdin -b PATCH "${PAPERLESS_URL%/}/api/workflow_triggers/<trigger_id>/" \
  "Authorization:Token $TOKEN" match="<validated match text>"
```

If that 403s (as it did historically — the paperless user may only have `change_workflow`, not `change_workflowtrigger`), `PATCH` the parent workflow instead with the full `triggers` array (all fields from the `GET`, with only `match` changed) via `POST`/`PATCH` `${PAPERLESS_URL}/api/workflows/<id>/`.

**Creating a new workflow** — `POST` to `${PAPERLESS_URL}/api/workflows/`:

```bash
http --ignore-stdin -b POST "${PAPERLESS_URL%/}/api/workflows/" "Authorization:Token $TOKEN" <<'JSON'
{
  "name": "<Institution> Statement",
  "order": 1,
  "enabled": true,
  "triggers": [
    {"type": 2, "matching_algorithm": 2, "match": "<validated match text>", "is_insensitive": true},
    {"type": 3, "matching_algorithm": 2, "match": "<validated match text>", "is_insensitive": true}
  ],
  "actions": [
    {"type": 1, "assign_correspondent": <correspondent_id>, "assign_document_type": <document_type_id>, "assign_tags": [<processed_tag_id>]},
    {"type": 2, "remove_tags": [<inbox_tag_id>], "remove_all_owners": true, "remove_all_permissions": true}
  ]
}
JSON
```

No confirmation prompt at this point — Step 3 already validated the match.

---

## Step 6 — Verify

Re-fetch the workflow and re-run the simulation:

```bash
http --ignore-stdin -b GET "${PAPERLESS_URL%/}/api/workflows/<id>/" "Authorization:Token $TOKEN"
python3 "$SIMULATE" "<validated match text>" <sample_document_id>
echo "exit: $?"   # must be 0
```

---

## Step 7 — Report

State what was created/changed: workflow name and ID, trigger match text, actions. Send to the caller directly, or via Telegram chat `7175022` if invoked headless from a reconciliation report. This is the transparency mechanism in place of a confirmation step — automatic does not mean silent.
