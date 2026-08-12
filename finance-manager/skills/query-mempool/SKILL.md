---
name: query-mempool
description: Look up Bitcoin transactions and addresses, and derive addresses from an xpub or wallet descriptor to check aggregate balance/history, via the public mempool.space API. Use when the user asks about a Bitcoin transaction (by txid), a Bitcoin address's balance or history, or wants to check a wallet descriptor/xpub (including multisig) against the blockchain — e.g. a hardware wallet reconciliation.
---

<objective>
Wraps the public mempool.space REST API (no authentication required) so the plugin can
look up a transaction by txid, an address's balance/history, or aggregate balance/history
across every used address in a wallet descriptor (single-sig or multisig, including BIP389
multipath descriptors like a 2-of-3 multisig hardware wallet's
`wsh(sortedmulti(2, xpub/<0;1>/*, ...))`).
</objective>

<quick_start>
All commands live in `scripts/mempool_cli.py` (needs `scripts/requirements.txt` installed
in a venv — only `descriptor` actually needs `bdkpython`; `tx`/`address` have no extra
dependency). Output is a human-readable table by default; add `--json` for structured
output.

```bash
python scripts/mempool_cli.py tx <txid>
python scripts/mempool_cli.py address <address>
python scripts/mempool_cli.py descriptor '<descriptor-string>' --gap-limit 20
python scripts/mempool_cli.py --json address <address> --page 2
```

`--network` (`mainnet` default / `testnet` / `signet`) picks the right mempool.space
instance automatically; override with `--api-url` for a self-hosted instance.

Rate-limited (HTTP 429) requests retry with exponential backoff automatically; if
mempool.space still won't respond (or is unreachable), mainnet/testnet requests fall
back to Blockstream's Esplora (`blockstream.info/api`) - same API shape, no auth
required. An explicit `--api-url` disables this fallback (you asked for one specific
instance). Signet has no public fallback.
</quick_start>

<reference_index>
`references/cli-reference.md` — full flag/subcommand reference, pagination details
(mempool.space's tx-history cursor is a **path** segment, not a query param — easy to get
wrong), exit codes, and example output.
</reference_index>

<success_criteria>
- `tx`/`address`/`descriptor` each return correct data for a known-real txid/address/descriptor.
- `--json` output round-trips through `json.loads` cleanly.
- Any list output (address tx history, descriptor's used-addresses list) is paginated at
  25/page via `--page` — never fetches or dumps an unbounded amount of data in one call.
</success_criteria>
