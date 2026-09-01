<required_reading>
**Read these reference files NOW before proceeding:**
1. references/sops.md

**Environment values:** resolve `$CONTAINERS_ROOT` and the service inventory from this plugin's `CLAUDE.md` (plugin root, one level above `skills/`) — never hardcode paths or service lists.
</required_reading>

<process>
<overview>
Manage SOPS-encrypted secrets for containers: rotate a provider key, or set up/convert a service to the single-container `sops exec-env` pattern. Applies to any service with a `.env.encrypted` in its directory.
</overview>

<rotate_key>
Identify the target service and the env var to change. Ask which key to rotate, or act on a named one.

```bash
# from $CONTAINERS_ROOT
./scripts/sops-set-env <service>/.env.encrypted <ENV_NAME>
# dedicated-key services: --age-key "$HOME/sops/age/<service>-keys.txt"
```

The script prompts masked, JSON-encodes, and pipes to `sops set --value-stdin` — value never on argv/history. Then:

```bash
docker restart <container>
```

The container re-decrypts `.env.encrypted` in-memory at boot. No rebuild needed.
</rotate_key>

<encrypt_new_secret>
To add a brand-new secret value to a service's `.env.encrypted`:

```bash
./scripts/sops-set-env <service>/.env.encrypted NEW_ENV_VAR
docker restart <container>
```

The file must already exist and be decryptable by the key in use. If the file doesn't exist yet, create and encrypt it first (see <setup_single_container>).
</encrypt_new_secret>

<setup_single_container>
Convert a sidecar-based secret injection to the single-container `sops exec-env` pattern, or set it up fresh:

1. Ensure the age key situation is right — dedicated per-service key is recommended (see references/sops.md `<key_model>`).
2. Re-encrypt `.env.encrypted` so the file's recipients include the key the container will hold (dual-recipient: master + dedicated).
3. Wire the compose service per references/sops.md `<single_container_pattern>`: `sops exec-env` entrypoint, `secrets.env`-suffixed encrypted-file mount, dedicated age-key mount, `SOPS_AGE_KEY_FILE`.
4. Remove the old sidecar service and any shared secrets volume from the root compose.
5. `docker compose up -d <service>` and verify (see references/sops.md `<verify>`).
</setup_single_container>

<verify>
```bash
# key present in decrypted child process env (value hidden)
docker exec <container> sh -c 'tr "\0" "\n" < /proc/<pid>/environ | grep -E "^<VAR>=" | sed "s/=.*/=<present>/"'
```
</verify>
</process>

<success_criteria>
- Key rotated via `sops-set-env` (value never on command line); restart picked it up (key present in child env)
- No cleartext `.env` written to any volume (single-container pattern: in-memory decrypt only)
- Sidecar removed if converting; compose validates
</success_criteria>
