#!/usr/bin/env python3
"""Simulate paperless-ngx's MATCH_ALL content-matching algorithm against a
real document's extracted text, without writing anything to the API.

Replicates documents/matching.py's matches() (MATCH_ALL branch) and
_split_match() from paperless-ngx: each word in the match text must appear
in the document content bounded by \\b...\\b (whole-word, case-insensitive
by default). This is the same check paperless-ngx runs when evaluating a
workflow trigger — running it locally first is what lets this skill apply
changes without a human confirmation step.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.request


def split_match(match_text: str) -> list[str]:
    findterms = re.compile(r'"([^"]+)"|(\S+)').findall
    normspace = re.compile(r"\s+").sub
    return [
        re.escape(normspace(" ", (t[0] or t[1]).strip())).replace(r"\ ", r"\s+")
        for t in findterms(match_text)
    ]


def simulate_match_all(
    match_text: str,
    content: str,
    is_insensitive: bool = True,
) -> tuple[bool, str | None]:
    flags = re.IGNORECASE if is_insensitive else 0
    for word in split_match(match_text):
        if not re.search(rf"\b{word}\b", content, flags=flags):
            return False, word
    return True, None


def get_token(url: str, username: str, password: str) -> str:
    req = urllib.request.Request(
        f"{url}/api/token/",
        data=json.dumps({"username": username, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    return json.load(urllib.request.urlopen(req))["token"]


def get_document_content(url: str, token: str, document_id: int) -> str:
    req = urllib.request.Request(
        f"{url}/api/documents/{document_id}/",
        headers={"Authorization": f"Token {token}"},
    )
    return json.load(urllib.request.urlopen(req)).get("content") or ""


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: simulate_match.py <match_text> <document_id>", file=sys.stderr)
        return 2

    match_text, document_id = sys.argv[1], int(sys.argv[2])
    url = os.environ["PAPERLESS_URL"].rstrip("/")
    token = get_token(
        url,
        os.environ["PAPERLESS_USERNAME"],
        os.environ["PAPERLESS_PASSWORD"],
    )
    content = get_document_content(url, token, document_id)

    matched, failed_word = simulate_match_all(match_text, content, is_insensitive=True)
    if matched:
        print(f"MATCH: all words in {match_text!r} found in document {document_id}")
        return 0
    print(
        f"NO MATCH: word {failed_word!r} (from {match_text!r}) "
        f"not found as a whole word in document {document_id}",
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
