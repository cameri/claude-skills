# Troubleshooting: document reprocessing & workflow behavior

Use this when a Paperless workflow appears to have not fired, a document seems mis-tagged/untriaged for no obvious reason, or text-extraction quality looks wrong and you need to know whether reprocessing would help before recommending it to the user.

## Reading the paperless-ngx container logs

Paperless runs as a Docker container (see the workspace's `containers/paperless-ngx/compose.yml` for the exact container name — do not hardcode it here). Tail recent logs:

```bash
docker logs <paperless-container-name> --since 30m 2>&1
```

Key log lines to look for:

- `[celery.worker.strategy] Task documents.tasks.consume_file[...] received` — a new document entered the consumption pipeline.
- `[celery.worker.strategy] Task documents.tasks.update_document_content_maybe_archive_file[...] received` — this is the task a `reprocess` bulk-edit action queues. Its completion line follows within seconds.
- `[paperless.parsing.<processor>] <Processor> extracted N chars from /path/to/original.pdf` — confirms which processor actually ran (e.g. `paperless.parsing.markitdown` for MarkItDown) and how much text it extracted. **This is the fastest way to confirm which processor produced a document's content**, without guessing from the output alone.
- `[paperless.parsing] convert exited 0` — the parser subprocess succeeded.
- `[paperless.tasks] Updating index for document <id>` — search index refreshed after a content change.
- `[django.request] Bad Request: /api/documents/bulk_edit/` — the bulk-edit API call was malformed (e.g. an invalid `method` value). Check the request against the endpoint's `OPTIONS` response (see below) rather than guessing method names.
- `[celery.beat] Scheduler: Sending due task ...` — scheduled jobs (workflow checks, classifier training, mail account polling) running on their normal cadence, not caused by your action.

To trigger a reprocess directly via the API (this re-runs whichever processor is *currently* configured against the existing original file — it does not let you pick an older/different processor, and it will not change anything if the current processor produces the same output on retry):

```bash
http --ignore-stdin -b POST "${PAPERLESS_URL%/}/api/documents/bulk_edit/" \
  "Authorization:Token $TOKEN" "Accept:application/json; version=6" \
  documents:='[<id>]' method=reprocess parameters:='{}'
```

To discover valid `method` values for this endpoint (they vary by Paperless version — `redo_ocr` is not valid in current versions, `reprocess` is):

```bash
http --ignore-stdin OPTIONS "${PAPERLESS_URL%/}/api/documents/bulk_edit/" \
  "Authorization:Token $TOKEN" "Accept:application/json; version=6"
```

**Important**: a `reprocess` call can return `{"result":"OK"}` and complete in the logs within 1-2 seconds — don't assume nothing happened just because the document's `content` field or `modified` timestamp look unchanged when you check immediately after. Check the logs first; if the processor line shows the same character count as before, the content is genuinely identical (confirmed via the document history endpoint below, not just eyeballing the text), and reprocessing will not produce a better result — the extraction quality issue is inherent to how the current processor handles that document's layout, not a stale-cache artifact.

**`reprocess` does not retroactively apply workflows.** Confirmed live: `reprocess` only re-runs content extraction — it does not re-evaluate workflow triggers, so a document that predates a newly-created or newly-fixed workflow stays untagged even after reprocessing (correspondent/document_type/tags unchanged). There is no `run_workflows` (or similar) bulk-edit method in this API version — check `OPTIONS` on `bulk_edit/` to confirm what's available on the instance you're working with. To retroactively apply a workflow to pre-existing documents, `PATCH` a real field on each document instead (updating `title` to its own current value works and has no side effects):

```bash
http --ignore-stdin -b PATCH "${PAPERLESS_URL%/}/api/documents/<id>/" \
  "Authorization:Token $TOKEN" "Accept:application/json; version=6" \
  title="<the document's own current title>"
```

This fires the "Document Updated" (`type: 3`) workflow trigger asynchronously — verify via a follow-up `GET` a few seconds later, not immediately. Test on one document before batch-applying to the rest.

## Reading a document's history

Every Paperless document has a full audit log, independent of the container logs:

```bash
http --ignore-stdin -b GET "${PAPERLESS_URL%/}/api/documents/<id>/history/" \
  "Authorization:Token $TOKEN" "Accept:application/json; version=6"
```

Returns a list of changes, newest first, each with `timestamp`, `action` (`create`/`update`/`delete`), `changes` (field → `[old, new]`, or `{"type": "m2m", "objects": [...], "operation": "add"/"delete"}` for tag changes), and `actor` (`null` means the system/automation made the change — a workflow or task; a populated `actor` object means a human did it via the UI or API with their own credentials).

This answers questions the container logs can't, because it's keyed to the document rather than to a time window:

- **Did a workflow actually fire on this document, and when?** Look for `document_type`, `correspondent`, or tag `add`/`delete` entries with `actor: null` — these are workflow-driven, not manual edits. Compare the timestamp against when the document was added (`create` action) to see the delay.
- **Was this document actually reprocessed, and did the content change?** Look for `update` entries with a `content` change — the `changes.content` array is `[old_text, new_text]`; if they're identical strings, the reprocess ran but produced no difference. A preceding `checksum` update with identical before/after values confirms the same original file was used (not a re-upload).
- **Who or what changed a field, and was it supposed to?** Any `actor` with a `username` was a human action — useful for distinguishing "the workflow did this automatically" from "someone corrected it by hand," which matters before assuming a workflow's matching logic needs fixing.

## When to escalate vs. when the answer is "this is expected"

- Reprocessing produces identical output (confirmed via a `paperless.parsing.<processor>` log line showing the same char count, or a `content` history entry with matching before/after) → the extraction issue is inherent to the current processor's handling of that document's layout. Don't keep reprocessing other documents expecting a different result — this is a processor capability question, not a per-document fluke. See `docs/finance/eq-bank-backfill-todo.md` in this workspace for a worked example (EQ Bank statements + MarkItDown) and consider filing/checking a TO-DOS.md entry about evaluating alternative processors rather than reprocessing document-by-document.
- A workflow's tag/correspondent/document_type changes show up in the document's history with `actor: null` at a sensible time after creation → the workflow did fire; if the document still looks wrong, the workflow's match conditions need adjusting (see `workflows/create-or-update-workflow.md`), not a reprocessing/timing issue.
- No workflow-driven changes appear in the history at all → the workflow never matched this document. Use `workflows/create-or-update-workflow.md` to create or fix one, sampling this document.
