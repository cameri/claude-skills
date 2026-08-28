---
name: study-status
description: Reports whether a previously-learned path (synced via learn_from) is stale and roughly what re-studying it would cost, without triggering a re-study. Use when the user asks whether a studied path needs re-syncing, or wants a cost estimate before running /graphify --update. Explicit-invocation only.
user-invocable: true
---

<objective>
Report whether a previously-learned path (synced via learn_from) is stale
and roughly what re-studying it would cost, without triggering a re-study.
</objective>

<quick_start>
Call the `study_status` tool with an optional `path` — a corpus root
previously synced via `learn_from`. That's the value graphify itself
recorded in `graphify-out/.graphify_root` for the run `learn_from` read,
normally the directory `graphify-out/` sits in. Omit `path` to report on
every path brain has ever studied.
</quick_start>

<output_fields>
Each result reports:

- `isStale` — true when graphify's own `detect_incremental()` finds any
  changed or deleted file since the last study.
- `changedFiles` / `deletedFiles` — counts behind that verdict.
- `needsLlm` — true if any changed file falls outside graphify's `code`
  category (docs, papers, images, video), which needs LLM-backed semantic
  extraction. False means the changes are code-only and re-studying is a
  free AST-only pass.
- `estimatedInputTokens` / `estimatedOutputTokens` — a rough extrapolation
  from that path's own `graphify-out/cost.json` history (per-file token
  rate of the most recent run × `changedFiles`), or `null` when there's no
  cost history to extrapolate from. Real cost depends on file size and
  complexity, not just file count — report it as an estimate, never a quote.
- `lastStudiedAt`, `lastDurationSeconds`, `lastInputTokens`,
  `lastOutputTokens` — what brain recorded for the last study of this path.
  `lastDurationSeconds` is `null` unless the agent that ran `/graphify`
  passed `duration_seconds` to `learn_from`; brain never invents one.

A path that has moved, or lost its graphify sidecar files, reports an
`error` field instead of throwing — one unreachable path never aborts a
report covering the whole registry. Check `error` before trusting
`isStale`, since an errored path reports `isStale: false`.
</output_fields>

<success_criteria>
`study_status` never triggers a re-study itself — it only reports. To
actually re-study a stale path, run `/graphify <path> --update` (or a fresh
`/graphify` run), then sync the result in with `learn_from`.
</success_criteria>
