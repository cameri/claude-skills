#!/usr/bin/env python3
"""Safely write a JSON config file: write to a temp file in the same directory,
validate it parses back and matches the input, then atomically replace the
target. Used for both config.json and credentials.json so a crash or invalid
write never corrupts the real file.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile


def write_json_atomic(path: str, data: dict, mode: int = 0o644) -> None:
    directory = os.path.dirname(path) or "."
    os.makedirs(directory, exist_ok=True)

    fd, tmp_path = tempfile.mkstemp(dir=directory, prefix=".tmp-", suffix=".json")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")

        with open(tmp_path) as f:
            reloaded = json.load(f)
        if reloaded != data:
            raise ValueError("validation failed: written content does not match input")

        os.chmod(tmp_path, mode)
        os.replace(tmp_path, path)
    except BaseException:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


def read_json(path: str, default: dict) -> dict:
    if not os.path.exists(path):
        return default
    with open(path) as f:
        return json.load(f)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: write_config.py <target-path> <json-file-to-write>", file=sys.stderr)
        return 2

    target_path, source_path = sys.argv[1], sys.argv[2]
    mode = 0o600 if "credentials" in os.path.basename(target_path) else 0o644

    with open(source_path) as f:
        data = json.load(f)

    write_json_atomic(target_path, data, mode=mode)
    print(f"wrote {target_path} ({len(json.dumps(data))} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
