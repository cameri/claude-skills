import io
import urllib.error

import pytest

from mempool_cli import (
    MempoolApiError,
    MempoolNotFoundError,
    MempoolRateLimitError,
    fetch_address_txs_page,
    fetch_json,
    fetch_with_fallback,
    format_table,
    paginate,
    render_address,
    render_descriptor_result,
    render_tx,
    resolve_api_urls,
    resolve_network,
    scan_branch,
    scan_descriptor,
    split_branches,
)


def test_format_table_aligns_columns_to_widest_cell():
    result = format_table(
        headers=["txid", "value"],
        rows=[["abc", "1000"], ["abcdefgh", "5"]],
    )

    lines = result.splitlines()
    assert lines[0] == "txid      value"
    assert lines[1] == "--------  -----"
    assert lines[2] == "abc       1000"
    assert lines[3] == "abcdefgh  5"


class _FakeResponse:
    def __init__(self, body: bytes):
        self._body = body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self):
        return self._body


def test_fetch_json_returns_parsed_body_on_success(monkeypatch):
    monkeypatch.setattr(
        "mempool_cli.urllib.request.urlopen",
        lambda req, timeout=10: _FakeResponse(b'{"txid": "abc"}'),
    )

    assert fetch_json("https://mempool.space/api/tx/abc") == {"txid": "abc"}


def test_fetch_json_raises_not_found_on_404(monkeypatch):
    def raise_404(req, timeout=10):
        raise urllib.error.HTTPError(req, 404, "Not Found", None, io.BytesIO(b""))

    monkeypatch.setattr("mempool_cli.urllib.request.urlopen", raise_404)

    with pytest.raises(MempoolNotFoundError):
        fetch_json("https://mempool.space/api/tx/doesnotexist")


def test_fetch_json_raises_rate_limit_after_exhausting_retries(monkeypatch):
    call_count = 0

    def raise_429(req, timeout=10):
        nonlocal call_count
        call_count += 1
        raise urllib.error.HTTPError(req, 429, "Too Many Requests", None, io.BytesIO(b""))

    monkeypatch.setattr("mempool_cli.urllib.request.urlopen", raise_429)
    monkeypatch.setattr("mempool_cli.time.sleep", lambda seconds: None)

    with pytest.raises(MempoolRateLimitError):
        fetch_json("https://mempool.space/api/tx/abc", max_retries=2)

    assert call_count == 3  # initial attempt + 2 retries


def test_fetch_json_retries_429_then_succeeds(monkeypatch):
    call_count = 0

    def flaky(req, timeout=10):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise urllib.error.HTTPError(req, 429, "Too Many Requests", None, io.BytesIO(b""))
        return _FakeResponse(b'{"txid": "abc"}')

    monkeypatch.setattr("mempool_cli.urllib.request.urlopen", flaky)
    monkeypatch.setattr("mempool_cli.time.sleep", lambda seconds: None)

    assert fetch_json("https://mempool.space/api/tx/abc", max_retries=3) == {"txid": "abc"}
    assert call_count == 3


def test_fetch_json_backs_off_with_increasing_delay(monkeypatch):
    sleeps = []

    def raise_429(req, timeout=10):
        raise urllib.error.HTTPError(req, 429, "Too Many Requests", None, io.BytesIO(b""))

    monkeypatch.setattr("mempool_cli.urllib.request.urlopen", raise_429)
    monkeypatch.setattr("mempool_cli.time.sleep", lambda seconds: sleeps.append(seconds))

    with pytest.raises(MempoolRateLimitError):
        fetch_json("https://mempool.space/api/tx/abc", max_retries=3, backoff_seconds=1.0)

    assert sleeps == [1.0, 2.0, 4.0]


def test_fetch_json_raises_api_error_on_connection_failure(monkeypatch):
    def raise_url_error(req, timeout=10):
        raise urllib.error.URLError("connection refused")

    monkeypatch.setattr("mempool_cli.urllib.request.urlopen", raise_url_error)

    with pytest.raises(MempoolApiError):
        fetch_json("https://mempool.space/api/tx/abc")


def test_render_tx_shows_summary_and_outputs():
    tx = {
        "txid": "abc123",
        "fee": 500,
        "size": 250,
        "weight": 1000,
        "status": {"confirmed": True, "block_height": 800000},
        "vout": [
            {"scriptpubkey_address": "bc1qexample", "value": 100000},
            {"scriptpubkey_type": "p2pk", "value": 5000000000},
        ],
    }

    result = render_tx(tx)

    assert "abc123" in result
    assert "yes" in result
    assert "800000" in result
    assert "bc1qexample" in result
    assert "100000" in result
    assert "p2pk" in result
    assert "5000000000" in result


def test_render_address_computes_confirmed_and_total_balance():
    addr_json = {
        "address": "bc1qexample",
        "chain_stats": {
            "tx_count": 2,
            "funded_txo_count": 2,
            "funded_txo_sum": 150000,
            "spent_txo_count": 1,
            "spent_txo_sum": 50000,
        },
        "mempool_stats": {
            "tx_count": 1,
            "funded_txo_count": 1,
            "funded_txo_sum": 20000,
            "spent_txo_count": 0,
            "spent_txo_sum": 0,
        },
    }

    result = render_address(addr_json)

    assert "bc1qexample" in result
    assert "100000" in result  # confirmed balance: 150000 - 50000
    assert "20000" in result  # unconfirmed delta
    assert "120000" in result  # total balance: 100000 + 20000
    assert "3" in result  # tx_count: 2 + 1


def test_fetch_address_txs_page_returns_page_1_with_a_single_call():
    pages = {
        "https://mempool.space/api/address/bc1q/txs/chain": [{"txid": "tx1"}, {"txid": "tx2"}],
    }
    calls = []

    def fake_fetch(url):
        calls.append(url)
        return pages[url]

    txs, has_more = fetch_address_txs_page(["https://mempool.space/api"], "bc1q", page=1, fetch=fake_fetch)

    assert [tx["txid"] for tx in txs] == ["tx1", "tx2"]
    assert has_more is False
    assert calls == ["https://mempool.space/api/address/bc1q/txs/chain"]


def test_fetch_address_txs_page_sequentially_cursors_to_requested_page_only():
    full_page = [{"txid": f"tx{i}"} for i in range(25)]
    pages = {
        "https://mempool.space/api/address/bc1q/txs/chain": full_page,
        "https://mempool.space/api/address/bc1q/txs/chain/tx24": [{"txid": "tx25"}, {"txid": "tx26"}],
    }
    calls = []

    def fake_fetch(url):
        calls.append(url)
        return pages[url]

    txs, has_more = fetch_address_txs_page(["https://mempool.space/api"], "bc1q", page=2, fetch=fake_fetch)

    assert [tx["txid"] for tx in txs] == ["tx25", "tx26"]
    assert has_more is False
    # only 2 calls made - never fetches beyond the requested page
    assert calls == [
        "https://mempool.space/api/address/bc1q/txs/chain",
        "https://mempool.space/api/address/bc1q/txs/chain/tx24",
    ]


def test_fetch_address_txs_page_reports_has_more_when_page_is_full():
    full_page = [{"txid": f"tx{i}"} for i in range(25)]

    def fake_fetch(url):
        return full_page

    txs, has_more = fetch_address_txs_page(["https://mempool.space/api"], "bc1q", page=1, fetch=fake_fetch)

    assert len(txs) == 25
    assert has_more is True


def test_paginate_slices_by_page_and_reports_has_more():
    items = list(range(30))

    page1, has_more1 = paginate(items, page=1, page_size=25)
    page2, has_more2 = paginate(items, page=2, page_size=25)

    assert page1 == list(range(25))
    assert has_more1 is True
    assert page2 == list(range(25, 30))
    assert has_more2 is False


def _addr_summary(funded_txo_count: int) -> dict:
    return {
        "chain_stats": {"funded_txo_count": funded_txo_count, "spent_txo_count": 0, "funded_txo_sum": 0, "spent_txo_sum": 0, "tx_count": funded_txo_count},
        "mempool_stats": {"funded_txo_count": 0, "spent_txo_count": 0, "funded_txo_sum": 0, "spent_txo_sum": 0, "tx_count": 0},
    }


def test_scan_branch_stops_after_gap_limit_consecutive_unused():
    # used at index 0, 1, and 3; then a gap of 2 unused (indices 4, 5) trips gap_limit=2
    used_indices = {0, 1, 3}
    queried = []

    def address_at(i):
        return f"addr{i}"

    def fetch_address_summary(addr):
        queried.append(addr)
        index = int(addr.removeprefix("addr"))
        return _addr_summary(1 if index in used_indices else 0)

    result = scan_branch(address_at, fetch_address_summary, gap_limit=2)

    assert [r["index"] for r in result] == [0, 1, 3]
    assert [r["address"] for r in result] == ["addr0", "addr1", "addr3"]
    # stops scanning at index 5 (2nd consecutive unused after addr3) - never queries addr6
    assert queried == ["addr0", "addr1", "addr2", "addr3", "addr4", "addr5"]


def _fresh_account_pubkey():
    import bdkpython as bdk

    mnemonic = bdk.Mnemonic(bdk.WordCount.WORDS12)
    root = bdk.DescriptorSecretKey(bdk.NetworkKind.MAIN, mnemonic, None)
    account = root.derive(bdk.DerivationPath("m/48'/0'/0'/2'"))
    return str(account.as_public())


def test_resolve_network_maps_cli_names_to_bdk_enums():
    import bdkpython as bdk

    assert resolve_network("mainnet") == (bdk.NetworkKind.MAIN, bdk.Network.BITCOIN)
    assert resolve_network("testnet") == (bdk.NetworkKind.TEST, bdk.Network.TESTNET)
    assert resolve_network("signet") == (bdk.NetworkKind.TEST, bdk.Network.SIGNET)


def test_split_branches_returns_single_item_for_non_multipath_descriptor():
    import bdkpython as bdk

    key = _fresh_account_pubkey()
    network_kind, network = resolve_network("mainnet")
    descriptor = bdk.Descriptor(f"wsh(sortedmulti(2,{key}/0/*,{key}/0/*))", network_kind)

    branches = split_branches(descriptor)

    assert len(branches) == 1


def test_split_branches_derives_distinct_deterministic_addresses_per_branch():
    import bdkpython as bdk

    k1, k2, k3 = _fresh_account_pubkey(), _fresh_account_pubkey(), _fresh_account_pubkey()
    network_kind, network = resolve_network("mainnet")
    descriptor_str = f"wsh(sortedmulti(2,{k1}/<0;1>/*,{k2}/<0;1>/*,{k3}/<0;1>/*))"
    descriptor = bdk.Descriptor(descriptor_str, network_kind)

    branches = split_branches(descriptor)
    assert len(branches) == 2

    receive_addr0 = str(branches[0].derive_address(0, network))
    change_addr0 = str(branches[1].derive_address(0, network))
    receive_addr1 = str(branches[0].derive_address(1, network))

    # receive and change branches diverge, and successive indices diverge
    assert receive_addr0 != change_addr0
    assert receive_addr0 != receive_addr1

    # deterministic: re-parsing the same descriptor string yields the same address
    redo = bdk.Descriptor(descriptor_str, network_kind)
    redo_branches = split_branches(redo)
    assert str(redo_branches[0].derive_address(0, network)) == receive_addr0


def test_scan_descriptor_aggregates_balance_and_tx_count_across_both_branches():
    k1, k2, k3 = _fresh_account_pubkey(), _fresh_account_pubkey(), _fresh_account_pubkey()
    descriptor_str = f"wsh(sortedmulti(2,{k1}/<0;1>/*,{k2}/<0;1>/*,{k3}/<0;1>/*))"

    import bdkpython as bdk

    network_kind, network = resolve_network("mainnet")
    branches = split_branches(bdk.Descriptor(descriptor_str, network_kind))
    receive_addr0 = str(branches[0].derive_address(0, network))
    change_addr0 = str(branches[1].derive_address(0, network))

    def fake_fetch(url):
        address = url.rsplit("/", 1)[-1]
        if address == receive_addr0:
            return _addr_summary_with_sum(funded_sum=100000, spent_sum=30000, tx_count=2)
        if address == change_addr0:
            return _addr_summary_with_sum(funded_sum=50000, spent_sum=0, tx_count=1)
        return _addr_summary(0)

    result = scan_descriptor(descriptor_str, "mainnet", gap_limit=3, api_urls=["https://mempool.space/api"], fetch=fake_fetch)

    assert result["confirmed_balance_sats"] == 120000  # (100000-30000) + (50000-0)
    assert result["tx_count"] == 3
    assert len(result["addresses"]) == 2


def _addr_summary_with_sum(funded_sum: int, spent_sum: int, tx_count: int) -> dict:
    return {
        "chain_stats": {
            "funded_txo_count": 1,
            "spent_txo_count": 0,
            "funded_txo_sum": funded_sum,
            "spent_txo_sum": spent_sum,
            "tx_count": tx_count,
        },
        "mempool_stats": {"funded_txo_count": 0, "spent_txo_count": 0, "funded_txo_sum": 0, "spent_txo_sum": 0, "tx_count": 0},
    }


def test_render_descriptor_result_shows_totals_and_used_addresses():
    result = {
        "confirmed_balance_sats": 120000,
        "unconfirmed_delta_sats": 0,
        "total_balance_sats": 120000,
        "tx_count": 3,
        "addresses": [
            {"index": 0, "address": "bc1qreceive", "summary": _addr_summary_with_sum(100000, 30000, 2)},
            {"index": 0, "address": "bc1qchange", "summary": _addr_summary_with_sum(50000, 0, 1)},
        ],
    }

    output = render_descriptor_result(result)

    assert "120000" in output
    assert "bc1qreceive" in output
    assert "bc1qchange" in output
    assert "70000" in output  # bc1qreceive's own confirmed balance: 100000 - 30000


def test_render_tx_list_shows_one_row_per_transaction():
    txs = [
        {"txid": "tx1", "fee": 100, "status": {"confirmed": True, "block_height": 800000}},
        {"txid": "tx2", "fee": 200, "status": {"confirmed": False}},
    ]

    from mempool_cli import render_tx_list

    output = render_tx_list(txs)

    assert "tx1" in output
    assert "tx2" in output
    assert "800000" in output
    assert "yes" in output
    assert "no" in output


def test_render_descriptor_result_shows_true_total_when_addresses_list_is_pre_sliced():
    result = {
        "confirmed_balance_sats": 70000,
        "unconfirmed_delta_sats": 0,
        "total_balance_sats": 70000,
        "tx_count": 2,
        "addresses": [
            {"index": 0, "address": "bc1qreceive", "summary": _addr_summary_with_sum(100000, 30000, 2)},
        ],
    }

    output = render_descriptor_result(result, total_addresses=5)

    assert "5" in output  # true total, not len(result["addresses"]) == 1


def test_resolve_api_urls_returns_primary_plus_fallback_by_default():
    urls = resolve_api_urls("mainnet", None)

    assert urls == ["https://mempool.space/api", "https://blockstream.info/api"]


def test_resolve_api_urls_respects_network_choice():
    urls = resolve_api_urls("testnet", None)

    assert urls == ["https://mempool.space/testnet/api", "https://blockstream.info/testnet/api"]


def test_resolve_api_urls_has_no_fallback_for_signet():
    urls = resolve_api_urls("signet", None)

    assert urls == ["https://mempool.space/signet/api"]


def test_resolve_api_urls_override_disables_fallback():
    urls = resolve_api_urls("mainnet", "https://my-node.local/api")

    assert urls == ["https://my-node.local/api"]


def test_fetch_with_fallback_uses_primary_when_it_succeeds():
    calls = []

    def fake_fetch(url):
        calls.append(url)
        return {"ok": True}

    result = fetch_with_fallback(
        "/tx/abc", ["https://mempool.space/api", "https://blockstream.info/api"], fetch=fake_fetch
    )

    assert result == {"ok": True}
    assert calls == ["https://mempool.space/api/tx/abc"]


def test_fetch_with_fallback_falls_through_on_rate_limit():
    calls = []

    def fake_fetch(url):
        calls.append(url)
        if "mempool.space" in url:
            raise MempoolRateLimitError("rate limited")
        return {"ok": True}

    result = fetch_with_fallback(
        "/tx/abc", ["https://mempool.space/api", "https://blockstream.info/api"], fetch=fake_fetch
    )

    assert result == {"ok": True}
    assert calls == ["https://mempool.space/api/tx/abc", "https://blockstream.info/api/tx/abc"]


def test_fetch_with_fallback_raises_immediately_on_404_without_trying_next_provider():
    calls = []

    def fake_fetch(url):
        calls.append(url)
        raise MempoolNotFoundError("not found")

    with pytest.raises(MempoolNotFoundError):
        fetch_with_fallback(
            "/tx/doesnotexist", ["https://mempool.space/api", "https://blockstream.info/api"], fetch=fake_fetch
        )

    assert calls == ["https://mempool.space/api/tx/doesnotexist"]


def test_fetch_with_fallback_raises_last_error_when_every_provider_fails():
    def fake_fetch(url):
        raise MempoolApiError(f"unreachable: {url}")

    with pytest.raises(MempoolApiError, match="blockstream.info"):
        fetch_with_fallback(
            "/tx/abc", ["https://mempool.space/api", "https://blockstream.info/api"], fetch=fake_fetch
        )
