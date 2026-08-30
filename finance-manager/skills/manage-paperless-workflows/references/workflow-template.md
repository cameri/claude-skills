Generic pattern for a Paperless-ngx workflow that auto-tags bank statement documents. Ships with no concrete Paperless IDs — this file must stay portable. This workspace's actual worked examples (with real IDs) live in `docs/finance/paperless-workflow-ids.md`, not here.

**Triggers (create two, identical except `type`)**

| Field | Value |
|---|---|
| `type` | `2` (Document Added) — one trigger; `3` (Document Updated) — second trigger |
| `matching_algorithm` | `2` (All words) |
| `is_insensitive` | `true` |
| `match` | 2–6 distinctive words from the institution name and statement boilerplate — see "Choosing match words" |
| all `filter_*` fields | leave unset — content match is the only gate, matching this workspace's earlier precedent workflows |

**Actions (create two)**

1. **Assign** (`type: 1`):
   - `assign_correspondent`: `<correspondent_id>`
   - `assign_document_type`: `<document_type_id>`
   - `assign_tags`: `[<processed_tag_id>]`
2. **Removal** (`type: 2`):
   - `remove_tags`: `[<inbox_tag_id>]` — resolved dynamically at runtime, see below
   - `remove_all_owners`: `true`
   - `remove_all_permissions`: `true`

The inbox tag ID is **never hardcoded**. Resolve it at runtime:

```bash
http --ignore-stdin -b GET "${PAPERLESS_URL%/}/api/tags/?page_size=200" "Authorization:Token $TOKEN" \
  | python3 -c "
import sys, json
tags = json.load(sys.stdin)['results']
inbox = [t for t in tags if t.get('is_inbox_tag')]
print(inbox[0]['id'] if inbox else 'NONE')
"
```

**Choosing match words**

- Prefer words that appear with clean whitespace boundaries in the document's extracted `content` field. Verify every candidate with `scripts/simulate_match.py` (Task 3) before ever using it — do not guess.
- Avoid words likely to be glued to neighboring text by OCR/PDF extraction (e.g. "Bank" inside a run-together institution name like `AcmeNationalBank`) — this exact failure broke an earlier workflow.
- Fewer, more distinctive words are safer than many generic ones. An institution name alone is often enough combined with "Statement".
- **Known limitation:** a single blanket workflow per institution can occasionally mis-tag adjacent non-statement documents from the same correspondent (e.g. a credit agreement that happens to mention "statement" in its boilerplate). This is accepted behavior, not a new risk. The consequence is a metadata reassignment, not data loss.
