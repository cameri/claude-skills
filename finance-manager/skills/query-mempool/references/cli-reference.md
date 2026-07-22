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
starting at index 0, and queries each via the address endpoint. Stops scanning a branch
after `--gap-limit` (default 20) consecutive addresses with zero funded TXOs in both
`chain_stats` and `mempool_stats`. Works for both single-sig and multisig (e.g. Bitkey's
2-of-3 `wsh(sortedmulti(2, ...))`) — the descriptor string is generic, nothing
Bitkey-specific is hardcoded.
</subcommands>

<flags>
| Flag | Applies to | Default | Notes |
|---|---|---|---|
| `--json` | all | off (table) | JSON output instead of a human-readable table |
| `--network` | all | `mainnet` | `mainnet` \| `testnet` \| `signet` — picks the default `--api-url` and the address-derivation network |
| `--api-url` | all | derived from `--network` | e.g. `https://mempool.space/testnet/api`; explicit value always wins over `--network`'s default |
| `--gap-limit` | `descriptor` | 20 | consecutive unused addresses (per branch) before stopping the scan |
| `--page` | `address`, `descriptor` | 1 | see `<pagination>` |
</flags>

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
| 1 | txid/address not found (HTTP 404), or rate-limited by mempool.space (HTTP 429) |
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
