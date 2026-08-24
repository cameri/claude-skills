#!/usr/bin/env python3
"""
SessionStart hook: regenerate a missing SSH public key from its surviving
private key, so the first signed git commit of a session doesn't fail.

Container restarts have repeatedly (2026-08-13, 2026-08-16, 2026-08-24)
left ~/.ssh/id_ed25519 (private key) in place while dropping
~/.ssh/id_ed25519.pub — breaking the SSH-signed commits this workspace's
git config requires (gpg.format=ssh, user.signingkey=~/.ssh/id_ed25519.pub)
with "Couldn't load public key ... No such file or directory" on the first
commit attempt. ed25519 public-key derivation from the private key is
deterministic, so regenerating reproduces the exact original public key —
nothing to re-register anywhere (GitHub etc. already trust it).

No config needed, no secrets touched — this only ever reads a private key
already present on disk and writes the corresponding public key next to it.
"""
import json
import os
import subprocess
import sys

PRIVATE_KEY_PATH = os.environ.get(
    "SSH_PUBKEY_CHECK_PRIVATE_KEY", os.path.expanduser("~/.ssh/id_ed25519")
)
PUBLIC_KEY_PATH = os.environ.get(
    "SSH_PUBKEY_CHECK_PUBLIC_KEY", os.path.expanduser("~/.ssh/id_ed25519.pub")
)


def needs_regeneration(private_key_path, public_key_path):
    """True only when the private key survived but its public half didn't
    — never true if the private key itself is also missing, since there's
    nothing to derive from."""
    return os.path.isfile(private_key_path) and not os.path.isfile(public_key_path)


def regenerate_public_key(private_key_path, public_key_path):
    """Derive the public key from the private key via `ssh-keygen -y` and
    write it out at 0644. Returns (ok, message)."""
    try:
        result = subprocess.run(
            ["ssh-keygen", "-y", "-f", private_key_path],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
    except Exception as e:
        return False, f"ssh-keygen failed: {e}"

    pubkey_line = result.stdout.strip()
    if not pubkey_line:
        return False, "ssh-keygen produced no output"

    try:
        with open(public_key_path, "w") as f:
            f.write(pubkey_line + "\n")
        os.chmod(public_key_path, 0o644)
    except OSError as e:
        return False, f"failed to write {public_key_path}: {e}"

    return True, None


def main():
    if os.path.exists(f"{os.path.abspath(__file__)}.disabled"):
        print(json.dumps({}))
        return

    try:
        sys.stdin.read()
    except Exception:
        pass

    if not needs_regeneration(PRIVATE_KEY_PATH, PUBLIC_KEY_PATH):
        print(json.dumps({}))
        return

    ok, error = regenerate_public_key(PRIVATE_KEY_PATH, PUBLIC_KEY_PATH)

    if ok:
        output = {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": (
                    f"{PUBLIC_KEY_PATH} was missing at session start (a "
                    "known container-restart artifact) — regenerated it "
                    f"from the surviving private key ({PRIVATE_KEY_PATH}) "
                    "so signed git commits work normally. No action needed."
                ),
            }
        }
    else:
        output = {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": (
                    f"{PUBLIC_KEY_PATH} is missing and automatic "
                    f"regeneration from {PRIVATE_KEY_PATH} failed ({error}). "
                    "The first signed git commit this session will fail "
                    "with 'Couldn't load public key' until this is fixed "
                    "manually — see the project_ssh_signing_key_missing_pub "
                    "memory for the recovery steps."
                ),
            }
        }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
