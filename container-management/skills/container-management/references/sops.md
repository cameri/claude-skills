<overview>
SOPS (with age) is how this stack encrypts third-party credentials — provider API keys, tokens — that a container needs at runtime. The encrypted file lives in the service directory as `.env.encrypted`; only the repo's age **public** key is in the repo. This reference is the general, service-agnostic pattern; read it before encrypting or rotating any container secret.
</overview>

<key_model>
**Master repo key (host-only):** `${HOME}/sops/age/keys.txt` (private), `public-age-key.txt` in the repo (public). Used to encrypt/decrypt across the repo. Never mounted into any container.

**Dedicated per-service key (optional, recommended):** a separate age keypair per service that needs in-container decryption, e.g. `${HOME}/sops/age/<service>-keys.txt`. The gateway-holder decrypts `.env.encrypted` at boot using **only** this key. Rationale: a compromised container leaks nothing beyond its own `.env.encrypted` — the master key never enters a container, so the blast radius is bounded to one service.

Files are often **dual-recipient** (master + dedicated) so host tooling (master) and the container (dedicated) can both decrypt.
</key_model>

<single_container_pattern>
Preferred runtime pattern — **decrypt in-memory at boot, no sidecar, no secrets volume.**

```yaml
# compose.yml (service fragment)
entrypoint:
  - sh
  - -c
  - |
    exec sops exec-env /run/secrets/secrets.env /opt/exp/entrypoint.sh
environment:
  - SOPS_AGE_KEY_FILE=/run/secrets/age-keys
secrets:
  - source: env-encrypted
    target: secrets.env   # *.env suffix so sops detects dotenv (exec-env has no --input-type)
  - age-keys
...
secrets:
  env-encrypted:
    file: ./.env.encrypted
  age-keys:
    file: ${HOME}/sops/age/<service>-keys.txt   # the dedicated per-service key
```

`sops exec-env` decrypts **in-memory** and injects the values into the child process environment — nothing is ever written to disk. Verify keys landed in the decrypted child (sops holds PID 1):

```bash
docker exec <container> sh -c 'tr "\0" "\n" < /proc/<pid>/environ | grep -E "^<VAR>="'
```

**Why not the old sidecar?** The earlier pattern used an `experiential-sops`-style sidecar writing decrypted `/secrets/.env` to a shared volume — that is **cleartext at rest** on the host and an extra root container holding a key. The single-container `exec-env` pattern removes both.
</single_container_pattern>

<rotate_key>
Keys are set/rotated with `$CONTAINERS_ROOT/scripts/sops-set-env` — the value flows over stdin (JSON-encoded), **never on the command line / shell history**:

```bash
# from $CONTAINERS_ROOT
./scripts/sops-set-env <service>/.env.encrypted <ENV_NAME>
# (masked prompt, "N characters captured")
docker restart <container>
```

The container re-decrypts `.env.encrypted` in-memory at boot. No rebuild, no sidecar.

If the service uses a dedicated age key (not the master), pass it:
```bash
./scripts/sops-set-env --age-key "$HOME/sops/age/<service>-keys.txt" <service>/.env.encrypted <ENV_NAME>
```
</rotate_key>

<gotchas>
- **Dotenv detection:** `sops exec-env` has no `--input-type` flag — it detects format from the filename. Mount the encrypted file with a `.env`-suffixed target (`target: secrets.env`) or decryption fails with `Error unmarshalling input json`.
- **sops `set` key format:** `["KEY"]` (double-quoted inside brackets); bare `[KEY]` → "Invalid set index format". Value must be a JSON literal.
- **`--input-type dotenv --output-type dotenv` required** for `sops set` when the file isn't a recognized dotenv extension.
- **Vendor key formats vary** — e.g. Z.AI keys are `id.secret` (2 parts); a mis-copied `id.id.secret` 401s. If you hit persistent auth failures after a rotation, re-enter the key rather than assuming the endpoint is wrong.
- **Values must be stored UNQUOTED** in `.env.encrypted` — `shell source` strips quotes but `sops exec-env` does not. A quoted value (e.g. `PASS='x'`) is injected with literal quotes and breaks the consumer (seen live: alby-hub's AUTO_UNLOCK_PASSWORD → "Invalid password").
- **No `--` separator** before the command in `sops exec-env`: `sops exec-env FILE "cmd args"` works; `sops exec-env FILE -- cmd` fails with "missing file to decrypt".
- **`exec-env` spawns the command via `/bin/sh`** — a distroless image (no shell: gatus, watchtower, beszel, tsdproxy, cloudflared) fails with `fork/exec /bin/sh: no such file`. Base the image on the sops alpine image + `COPY --from=<app> <bin> <bin>`, or ensure `/bin/sh` exists.
- **Non-root containers can't read 0600 root bind-mounted keys** — chmod 0644 the dedicated `<service>-keys.txt` file (dedicated key leaks only that service's secrets, so world-read is acceptable). Experiential, cloudflared, alby-hub, homepage run non-root.
- **Healthcheck on busybox-only images** must be exec-form array (`["CMD","/busybox/busybox","nc",...]`); a string form wraps in `/bin/sh -c` which doesn't exist.
- **Nested quotes in `ENTRYPOINT` get mangled** by Docker (becomes `["/bin/sh","-c","["/busybox/sh"...]"]`). Use a COPY'd wrapper script + `ENTRYPOINT ["/busybox/sh","/entrypoint.sh"]` instead.
</gotchas>

<verify>
```bash
# key present in decrypted child process env (value hidden)
docker exec <container> sh -c 'tr "\0" "\n" < /proc/<pid>/environ | grep -E "^<VAR>=" | sed "s/=.*/=<present>/"'
```
</verify>
