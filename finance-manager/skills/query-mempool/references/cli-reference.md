<setup>
`scripts/mempool_cli.py` has no external dependency for `tx`/`address` (stdlib only,
`urllib`). The `descriptor` subcommand needs `bdkpython`, imported lazily so it's only
required when that subcommand actually runs.

```bash
cd scripts
uv venv .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python mempool_cli.py tx <txid>
```
</setup>

<subcommands>
**`tx <txid>`** — single call to `GET /tx/:txid`. The response already embeds a full
`status` object (`confirmed`, `block_height`, `block_hash`, `block_time`) — there is no
separate status call.

**`address <address>`** — `GET /address/:address` for the balance summary, plus one page
of confirmed tx history (see `<pagination>`).

**`descriptor <descriptor-string>`** — parses with bdkpython, splits BIP389 multipath
descriptors into their external (`/0/*`) and internal (`/1/*`) branches automatically
(`Descriptor.is_multipath()` / `to_single_descriptors()`), derives addresses per branch
starting at index 0 (or `--start-index`, see below), and queries each via the address
endpoint, waiting `--request-delay` seconds between successive lookups. Stops scanning a
branch after `--gap-limit` (default 20) consecutive addresses with zero funded TXOs in
both `chain_stats` and `mempool_stats`. Works for both single-sig and multisig (e.g.
a 2-of-3 hardware wallet's `wsh(sortedmulti(2, ...))`) — the descriptor string is generic,
nothing wallet-brand-specific is hardcoded.

The result includes `last_scanned_index` — the highest address index actually checked
across all branches this run. For a wallet that never reuses addresses, pass
`--start-index <last_scanned_index + 1>` on the next run to resume from there instead of
re-deriving and re-querying every address from 0 again. This applies the same start index
to every branch; a multipath descriptor's receive and change branches can differ slightly
in real depth, so the shallower branch may re-check a handful of already-confirmed-empty
addresses — harmless, just a few extra requests.
</subcommands>

<flags>
| Flag | Applies to | Default | Notes |
|---|---|---|---|
| `--json` | all | off (table) | JSON output instead of a human-readable table |
| `--network` | all | `mainnet` | `mainnet` \| `testnet` \| `signet` — picks the default `--api-url` and the address-derivation network |
| `--api-url` | all | derived from `--network` | e.g. `https://mempool.space/testnet/api`; explicit value always wins over `--network`'s default, and **disables automatic fallback** (see `<retry_and_fallback>`) — an explicit URL is assumed to mean "use exactly this instance" |
| `--gap-limit` | `descriptor` | 20 | consecutive unused addresses (per branch) before stopping the scan |
| `--request-delay` | `descriptor` | 0.5s | seconds to wait between successive address lookups during the scan — see `<retry_and_fallback>` |
| `--start-index` | `descriptor` | 0 | resume scanning from this address index instead of 0; see `last_scanned_index` above |
| `--page` | `address`, `descriptor` | 1 | see `<pagination>` |
</flags>

<retry_and_fallback>
mempool.space does not publish its rate-limit thresholds ("if you have to ask you'll hit
them" — project maintainers), so two independent mitigations apply:

**Proactive pacing.** `descriptor` waits `--request-delay` (default 0.5s) between
successive address lookups during a scan, rather than firing requests as fast as
possible and only reacting after a 429. A wide `--gap-limit` scan (tens to 100+
addresses per branch) is the case most likely to trip a rate limit; widen the delay
further if scans still hit 429s.

**Reactive backoff.** Every request that gets HTTP 429 (rate limited) retries against
the *same* provider (3 retries by default, i.e. 4 attempts total) before giving up on
that provider. If the 429 response carries a `Retry-After` header (delta-seconds or an
HTTP-date), that value is honored in place of the exponential schedule — neither
mempool.space nor Blockstream document sending this header, but respecting it when a
provider does is strictly safer than guessing, and costs nothing when it's absent. Every
sleep, whether from `Retry-After` or the exponential fallback, is capped at
`RATE_LIMIT_MAX_SLEEP_SECONDS` (60s) so a malformed or hostile header value can't hang
the CLI. Without a usable `Retry-After`, the schedule is plain exponential backoff: 1s,
2s, 4s.

If a provider is still rate-limited after retries, or is unreachable outright, the CLI
falls through to the next provider in line rather than failing the whole command.
Default provider order per network (no `--api-url` given):

| Network | Providers tried in order |
|---|---|
| `mainnet` | `mempool.space/api` → `blockstream.info/api` |
| `testnet` | `mempool.space/testnet/api` → `blockstream.info/testnet/api` |
| `signet` | `mempool.space/signet/api` only (no public Blockstream signet instance) |

Blockstream's Esplora is API-shape-compatible with mempool.space (mempool.space's own
API is derived from it) — no API key, same endpoint paths — so this fallback is a
drop-in swap of the base URL, nothing provider-specific in the request logic.

A 404 (genuinely missing txid/address) is never retried or failed-over — every
provider indexes the same chain, so if one says "not found" the others will too.

An explicit `--api-url` collapses the provider list to just that one URL — no
fallback is attempted, since specifying a URL is assumed to mean you want exactly
that instance (e.g. a self-hosted node).
</retry_and_fallback>

<pagination>
Every list-returning command is paginated at 25 items/page via `--page`.

**`address`'s tx history** — mempool.space's own confirmed-history endpoint takes its
pagination cursor as a **path** segment: `GET /address/:address/txs/chain/:last_seen_txid`.
This was verified against the live API after an initial docs read suggested a
`?after_txid=` **query** parameter — that form is silently accepted but ignored, and
returns page 1 again no matter what value is passed. Don't reintroduce the query-param
form. Because the cursor requires the previous page's last txid, reaching page N means
sequentially requesting pages `1..N` — there's no jumping directly to page N — but the CLI
never fetches past the page actually requested.

`has_more` is a heuristic: `true` whenever the fetched page came back full (25 items).
When the true total is an exact multiple of 25, this means one extra (cheap, empty) request
on the following page before `has_more` correctly resolves to `false` — a deliberate
trade-off to avoid an extra always-issued request per page in the common case.

**`descriptor`'s used-addresses list** — already fully materialized in memory (bounded by
`--gap-limit`), so `--page` just slices it; no extra requests.
</pagination>

<exit_codes>
| Code | Meaning |
|---|---|
| 0 | success |
| 1 | txid/address not found (HTTP 404), or every available provider is still rate-limited (HTTP 429) after retries and fallback |
| 2 | network/connection failure |
</exit_codes>

<example_output>
Table (`tx`):
```
txid                                                              confirmed  block_height  fee_sats  size  weight
----------------------------------------------------------------  ---------  ------------  --------  ----  ------
4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b  yes        0             0         204   816

Outputs:
vout  address  value_sats
----  -------  ----------
0     p2pk     5000000000
```

JSON (`--json address ... --page 2`):
```json
{
  "address": "...",
  "chain_stats": { "...": "..." },
  "mempool_stats": { "...": "..." },
  "page": 2,
  "has_more": true,
  "txs": [ { "txid": "...", "...": "..." } ]
}
```
</example_output>
