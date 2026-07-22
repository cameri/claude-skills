#!/usr/bin/env python3
"""CLI for querying mempool.space: transactions, addresses, and wallet
descriptors (via bdkpython address derivation with gap-limit scanning).
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

DEFAULT_API_URLS = {
    "mainnet": "https://mempool.space/api",
    "testnet": "https://mempool.space/testnet/api",
    "signet": "https://mempool.space/signet/api",
}


class MempoolApiError(Exception):
    pass


class MempoolNotFoundError(MempoolApiError):
    pass


class MempoolRateLimitError(MempoolApiError):
    pass


def fetch_json(url: str, timeout: int = 10):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise MempoolNotFoundError(f"not found: {url}") from exc
        if exc.code == 429:
            raise MempoolRateLimitError("rate limited by mempool.space, retry later") from exc
        raise MempoolApiError(f"HTTP {exc.code} from {url}: {exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise MempoolApiError(f"request to {url} failed: {exc.reason}") from exc


def resolve_network(name: str):
    import bdkpython as bdk

    return {
        "mainnet": (bdk.NetworkKind.MAIN, bdk.Network.BITCOIN),
        "testnet": (bdk.NetworkKind.TEST, bdk.Network.TESTNET),
        "signet": (bdk.NetworkKind.TEST, bdk.Network.SIGNET),
    }[name]


def split_branches(descriptor):
    if descriptor.is_multipath():
        return descriptor.to_single_descriptors()
    return [descriptor]


def scan_descriptor(
    descriptor_str: str,
    network_name: str,
    gap_limit: int,
    api_url: str,
    fetch=fetch_json,
) -> dict:
    import bdkpython as bdk

    network_kind, network = resolve_network(network_name)
    branches = split_branches(bdk.Descriptor(descriptor_str, network_kind))

    addresses: list[dict] = []
    for branch in branches:
        def address_at(index, branch=branch):
            return str(branch.derive_address(index, network))

        def fetch_address_summary(address):
            return fetch(f"{api_url}/address/{address}")

        addresses.extend(scan_branch(address_at, fetch_address_summary, gap_limit))

    confirmed_balance = 0
    unconfirmed_delta = 0
    tx_count = 0
    for entry in addresses:
        cs = entry["summary"]["chain_stats"]
        ms = entry["summary"]["mempool_stats"]
        confirmed_balance += cs["funded_txo_sum"] - cs["spent_txo_sum"]
        unconfirmed_delta += ms["funded_txo_sum"] - ms["spent_txo_sum"]
        tx_count += cs["tx_count"] + ms["tx_count"]

    return {
        "addresses": addresses,
        "confirmed_balance_sats": confirmed_balance,
        "unconfirmed_delta_sats": unconfirmed_delta,
        "total_balance_sats": confirmed_balance + unconfirmed_delta,
        "tx_count": tx_count,
    }


def _is_unused(addr_json: dict) -> bool:
    return (
        addr_json["chain_stats"]["funded_txo_count"] == 0
        and addr_json["mempool_stats"]["funded_txo_count"] == 0
    )


def scan_branch(address_at, fetch_address_summary, gap_limit: int) -> list[dict]:
    used: list[dict] = []
    consecutive_unused = 0
    index = 0
    while consecutive_unused < gap_limit:
        address = address_at(index)
        summary = fetch_address_summary(address)
        if _is_unused(summary):
            consecutive_unused += 1
        else:
            consecutive_unused = 0
            used.append({"index": index, "address": address, "summary": summary})
        index += 1
    return used


ADDRESS_TXS_PAGE_SIZE = 25


def paginate(items: list, page: int, page_size: int = 25) -> tuple[list, bool]:
    start = (page - 1) * page_size
    end = start + page_size
    return items[start:end], end < len(items)


def fetch_address_txs_page(api_url: str, address: str, page: int, fetch=fetch_json) -> tuple[list[dict], bool]:
    """Fetch only up to the requested page (25 txs/page) of an address's confirmed
    history - mempool.space's cursor-based pagination means reaching page N requires
    sequentially requesting pages 1..N, but this never fetches beyond that."""
    base_url = f"{api_url}/address/{address}/txs/chain"
    url = base_url
    current_page: list[dict] = []
    for page_num in range(1, page + 1):
        current_page = fetch(url)
        if len(current_page) < ADDRESS_TXS_PAGE_SIZE:
            return current_page, False
        if page_num < page:
            url = f"{base_url}/{current_page[-1]['txid']}"
    return current_page, True


def render_descriptor_result(result: dict, total_addresses: int | None = None) -> str:
    if total_addresses is None:
        total_addresses = len(result["addresses"])
    summary = format_table(
        headers=[
            "confirmed_balance_sats",
            "unconfirmed_delta_sats",
            "total_balance_sats",
            "tx_count",
            "addresses_used",
        ],
        rows=[
            [
                str(result["confirmed_balance_sats"]),
                str(result["unconfirmed_delta_sats"]),
                str(result["total_balance_sats"]),
                str(result["tx_count"]),
                str(total_addresses),
            ]
        ],
    )
    addresses = format_table(
        headers=["index", "address", "confirmed_balance_sats"],
        rows=[
            [
                str(entry["index"]),
                entry["address"],
                str(entry["summary"]["chain_stats"]["funded_txo_sum"] - entry["summary"]["chain_stats"]["spent_txo_sum"]),
            ]
            for entry in result["addresses"]
        ],
    )
    return f"{summary}\n\nAddresses:\n{addresses}"


def render_address(addr_json: dict) -> str:
    cs = addr_json["chain_stats"]
    ms = addr_json["mempool_stats"]
    confirmed_balance = cs["funded_txo_sum"] - cs["spent_txo_sum"]
    unconfirmed_delta = ms["funded_txo_sum"] - ms["spent_txo_sum"]
    return format_table(
        headers=[
            "address",
            "confirmed_balance_sats",
            "unconfirmed_delta_sats",
            "total_balance_sats",
            "tx_count",
        ],
        rows=[
            [
                addr_json["address"],
                str(confirmed_balance),
                str(unconfirmed_delta),
                str(confirmed_balance + unconfirmed_delta),
                str(cs["tx_count"] + ms["tx_count"]),
            ]
        ],
    )


def render_tx_list(txs: list[dict]) -> str:
    return format_table(
        headers=["txid", "confirmed", "block_height", "fee_sats"],
        rows=[
            [
                tx["txid"],
                "yes" if tx["status"].get("confirmed") else "no",
                str(tx["status"].get("block_height", "")),
                str(tx["fee"]),
            ]
            for tx in txs
        ],
    )


def render_tx(tx: dict) -> str:
    status = tx["status"]
    summary = format_table(
        headers=["txid", "confirmed", "block_height", "fee_sats", "size", "weight"],
        rows=[
            [
                tx["txid"],
                "yes" if status.get("confirmed") else "no",
                str(status.get("block_height", "")),
                str(tx["fee"]),
                str(tx["size"]),
                str(tx["weight"]),
            ]
        ],
    )
    outputs = format_table(
        headers=["vout", "address", "value_sats"],
        rows=[
            [str(i), v.get("scriptpubkey_address", v.get("scriptpubkey_type", "unknown")), str(v["value"])]
            for i, v in enumerate(tx["vout"])
        ],
    )
    return f"{summary}\n\nOutputs:\n{outputs}"


def format_table(headers: list[str], rows: list[list[str]]) -> str:
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))

    def format_row(cells: list[str]) -> str:
        padded = [cell.ljust(widths[i]) for i, cell in enumerate(cells[:-1])]
        padded.append(cells[-1])
        return "  ".join(padded)

    lines = [format_row(headers), "  ".join("-" * w for w in widths)]
    lines.extend(format_row(row) for row in rows)
    return "\n".join(lines)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Query mempool.space: transactions, addresses, and wallet descriptors")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of a table")
    parser.add_argument("--network", choices=sorted(DEFAULT_API_URLS), default="mainnet")
    parser.add_argument("--api-url", help="Override the default mempool.space API base URL for --network")

    subparsers = parser.add_subparsers(dest="command", required=True)

    tx_parser = subparsers.add_parser("tx", help="Look up a transaction by txid")
    tx_parser.add_argument("txid")

    address_parser = subparsers.add_parser("address", help="Look up an address's balance and tx history")
    address_parser.add_argument("address")
    address_parser.add_argument("--page", type=int, default=1, help="Tx history page (25 per page, default 1)")

    descriptor_parser = subparsers.add_parser(
        "descriptor", help="Derive addresses from a wallet descriptor and aggregate balance/history"
    )
    descriptor_parser.add_argument("descriptor")
    descriptor_parser.add_argument("--gap-limit", type=int, default=20)
    descriptor_parser.add_argument("--page", type=int, default=1, help="Used-addresses page (25 per page, default 1)")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    api_url = args.api_url or DEFAULT_API_URLS[args.network]

    try:
        if args.command == "tx":
            tx = fetch_json(f"{api_url}/tx/{args.txid}")
            print(json.dumps(tx, indent=2) if args.json else render_tx(tx))
        elif args.command == "address":
            summary = fetch_json(f"{api_url}/address/{args.address}")
            txs, has_more = fetch_address_txs_page(api_url, args.address, args.page)
            if args.json:
                print(json.dumps({**summary, "page": args.page, "has_more": has_more, "txs": txs}, indent=2))
            else:
                print(render_address(summary))
                if txs:
                    print("\nTransactions:")
                    print(render_tx_list(txs))
                print(f"\nPage {args.page}" + (f" (more available - use --page {args.page + 1})" if has_more else ""))
        elif args.command == "descriptor":
            result = scan_descriptor(args.descriptor, args.network, args.gap_limit, api_url)
            page_addresses, has_more = paginate(result["addresses"], args.page)
            total_addresses = len(result["addresses"])
            display_result = {**result, "addresses": page_addresses}
            if args.json:
                print(json.dumps({**display_result, "page": args.page, "has_more": has_more, "total_addresses": total_addresses}, indent=2))
            else:
                print(render_descriptor_result(display_result, total_addresses=total_addresses))
                print(f"\nPage {args.page}" + (f" (more available - use --page {args.page + 1})" if has_more else ""))
    except (MempoolNotFoundError, MempoolRateLimitError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except MempoolApiError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
