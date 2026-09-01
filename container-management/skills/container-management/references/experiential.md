<overview>
The `experiential` service under `$CONTAINERS_ROOT/experiential/` is a self-hosted model gateway ("local OpenRouter"): one OpenAI-compatible `/v1` API over BYOK provider models (Z.AI GLM, DeepSeek, Anthropic), reachable via TsDproxy at `https://router.panther-lizard.ts.net/v1`.

This reference covers the two maintenance tasks for this service: **rotating provider API keys** and **adding/removing models**. Both are scripted; read this before editing anything in the service directory.
</overview>

<architecture>
**Single container.** Provider keys are SOPS-encrypted in `$CONTAINERS_ROOT/experiential/.env.encrypted` (dual-recipient: the repo master age key **and** a dedicated per-service age key). At boot the container runs `sops exec-env /run/secrets/secrets.env /opt/exp/entrypoint.sh` — sops decrypts **in-memory** and injects the values into the gateway process environment. No cleartext is ever written to disk: there is no secrets volume, no sidecar, and the encrypted file + age key are mounted read-only.

Two secrets mount into the gateway:
- `env-encrypted` → `/run/secrets/secrets.env` (the sops file; named `secrets.env` so sops detects dotenv format from the extension — `exec-env` has no `--input-type` flag)
- `age-keys` → the dedicated key at `${HOME}/sops/age/experiential-keys.txt` (`SOPS_AGE_KEY_FILE`). This key decrypts **only** this `.env.encrypted`; the master repo key never enters any container, so a compromised gateway leaks nothing beyond its own provider keys.

**Model manifest:** `$CONTAINERS_ROOT/experiential/models.json` is the curated source of truth — which models the gateway exposes per provider, with `contextWindow`/`maxTokens`. Aliases are named by real provider model id (e.g. `deepseek-v4-flash`, `glm-5.3-flash`), not friendly shorthands.
</architecture>

<rotate_key>
Provider keys are set/rotated with `$CONTAINERS_ROOT/scripts/sops-set-env` — the value flows over stdin (JSON-encoded), **never on the command line / shell history**.

```bash
# from $CONTAINERS_ROOT
./scripts/sops-set-env experiential/.env.encrypted DEEPSEEK_API_KEY
# (or ZAI_API_KEY, ANTHROPIC_API_KEY — masked prompt, "N characters captured")
docker restart experiential
```

The gateway re-decrypts the file in-memory at boot. No rebuild, no sidecar, nothing else to touch.

**Key format gotcha (Z.AI):** a Z.AI key is `id.secret` (2 parts, ~49 chars). A mis-copied `id.id.secret` (3 parts, ~82 chars) 401s on every auth method (`{"code":"401","message":"token expired or incorrect"}`). If you get persistent 401s, re-enter the key.
</rotate_key>

<sync_models>
Models are edited in the manifest, or synced automatically against the providers' live `/models` endpoints:

```bash
# from $CONTAINERS_ROOT
# report drift vs live endpoints (NEW / SUNSET) — no changes
./scripts/experiential-sync-models --check

# apply: add NEW models (family-default metadata), remove SUNSET ones, then
# propagate to the running gateway + entrypoint.sh + ~/.omp-agent/models.yml
./scripts/experiential-sync-models --apply
```

`--apply` is idempotent. New models are added with family-default metadata (`glm-*`/`deepseek-*` → 1M context, size-tiered maxTokens) — review `contextWindow`/`maxTokens` in `models.json` afterward if the defaults are wrong. Anthropic has no `/models` endpoint, so it's curated manually in the manifest (the `claude-sonnet` alias carries an explicit `model: claude-sonnet-4-5` mapping).
</sync_models>

<verify>
```bash
# keys present in the gateway python process env (sops holds PID 1; the keys
# live in the decrypted child, value hidden)
docker exec experiential sh -c 'tr "\0" "\n" < /proc/19/environ | grep -E "^(ZAI|DEEPSEEK|ANTHROPIC)_API_KEY="'

# gateway serves the expected models
KEY=$(docker exec experiential cat /data/exp/gateway-key)
docker exec experiential sh -c "curl -s -m 15 http://127.0.0.1:8000/v1/models -H 'Authorization: Bearer $KEY'"

# end-to-end through omp (registered as the `experiential` provider)
omp -p --model experiential/deepseek-v4-flash "Reply with exactly the word PONG."
```
</verify>

<versioning>
The gateway image pins `EXPERIENTIAL_VERSION` in its `Containerfile` (default `0.7.19`). Do **not** unpin it — the provisioned authority (catalog snapshots) is version-specific; an unpinned install drifts the catalog and breaks boot with `catalog digest does not match` (requires wiping `/data/exp/gateway` + `/data/exp/gateway-key` and re-provisioning, which rotates the gateway virtual key that omp's `~/.omp-agent/.env` references).
</versioning>
