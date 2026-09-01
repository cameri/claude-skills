<required_reading>
**Read these reference files NOW before proceeding:**
1. references/experiential.md

**Environment values:** resolve `$CONTAINERS_ROOT` from this plugin's `CLAUDE.md` (plugin root, one level above `skills/`) — never hardcode paths or service lists.
</required_reading>

<process>
<overview>
The `experiential` gateway is a single container at `$CONTAINERS_ROOT/experiential/`. Two operational tasks: rotate a provider API key, or sync the exposed model list against the providers' live `/models` endpoints.
</overview>

<rotate_key>
Ask which provider key (or act on a named one): `ZAI_API_KEY`, `DEEPSEEK_API_KEY`, or `ANTHROPIC_API_KEY`.

```bash
# from $CONTAINERS_ROOT
./scripts/sops-set-env experiential/.env.encrypted <ENV_NAME>
```

The script prompts masked, JSON-encodes the value, and pipes it to `sops set --value-stdin` — the value never appears in argv or shell history. Then:

```bash
docker restart experiential
```

The gateway re-decrypts `.env.encrypted` in-memory at boot. No rebuild needed.

**Z.AI gotcha:** keys are `id.secret` (2 parts, ~49 chars). A `id.id.secret` key 401s.
</rotate_key>

<sync_models>
Run the sync script. Prefer `--check` first to see drift, then `--apply`:

```bash
# from $CONTAINERS_ROOT
./scripts/experiential-sync-models --check   # report NEW / SUNSET vs live endpoints
./scripts/experiential-sync-models --apply   # reconcile manifest + propagate
```

`--apply` idempotently:
1. Adds NEW models (live but not in manifest) with family-default metadata
2. Removes SUNSET models (in manifest but no longer served)
3. Propagates to the running gateway (alias create/update + grant, disable removed), `entrypoint.sh`'s provisioning loop, and `~/.omp-agent/models.yml`

After `--apply`, check the added models' `contextWindow`/`maxTokens` in `$CONTAINERS_ROOT/experiential/models.json` — new models get family defaults that may need tuning.
</sync_models>

<verify>
```bash
# keys present (value hidden)
docker exec experiential sh -c 'tr "\0" "\n" < /proc/19/environ | grep -E "^(ZAI|DEEPSEEK|ANTHROPIC)_API_KEY="'

# models served
KEY=$(docker exec experiential cat /data/exp/gateway-key)
docker exec experiential sh -c "curl -s -m 15 http://127.0.0.1:8000/v1/models -H 'Authorization: Bearer $KEY'"

# end-to-end through omp
omp -p --model experiential/deepseek-v4-flash "Reply with exactly the word PONG."
```
</verify>
</process>

<success_criteria>
- Key rotated via `sops-set-env` (value never on command line); keys present in gateway process env after restart
- Model list matches the provider's live `/models` endpoint (no drift on `--check`)
- Gateway healthy and serving the expected models
- End-to-end `omp` call returns a completion (not an error)
</success_criteria>
