# Workflow: Remove a Service

<required_reading>
**Read these reference files NOW before proceeding:**
1. references/environment.md
</required_reading>

<process>
<step_1_confirm>
## Step 1: Confirm removal

State the service being removed and ask the user to confirm before making any changes. Removal is destructive — deleted volumes cannot be recovered.

Announce:
- Service name and directory
- Whether it has a named volume (data loss risk)
- Whether it's currently running
</step_1_confirm>

<step_2_stop>
## Step 2: Stop the service

```bash
cd /workspace/containers
docker compose stop <service>
```
</step_2_stop>

<step_3_root_compose>
## Step 3: Remove from root compose.yml

Edit `/workspace/containers/compose.yml` and remove the include line:

```yaml
# Remove this line:
  - <service>/compose.yml
```
</step_3_root_compose>

<step_4_gatus>
## Step 4: Remove from Gatus config

Edit `/workspace/containers/gatus/config/config.yaml` and remove the endpoint entry for this service.

Gatus hot-reloads — no restart needed.
</step_4_gatus>

<step_5_tsdproxy>
## Step 5: Remove from TsDproxy config (if present)

Check all files in `/workspace/containers/tsdproxy/config/`:
- `applications.yaml`
- `admin-tools.yaml`
- `infrastructure.yaml`
- `automation.yaml`

Remove the service entry if found. Restart TsDproxy after:

```bash
docker compose restart tsdproxy
```
</step_5_tsdproxy>

<step_6_cloudflare>
## Step 6: Remove from Cloudflare tunnel (if applicable)

If the service had a public Cloudflare tunnel entry, update the tunnel ingress via the API to remove it (see add-service.md step 6 for the API pattern).
</step_6_cloudflare>

<step_7_volumes>
## Step 7: Remove volumes (ask first)

**Ask the user** whether to remove the associated volume. Data cannot be recovered after removal.

If confirmed:
```bash
docker volume rm <volume_name>
```

Named volumes are defined in the service's `compose.yml`. Check the `volumes:` section at the bottom.
</step_7_volumes>

<step_8_directory>
## Step 8: Remove the service directory (optional)

Only remove if the user explicitly wants to clean up the files:

```bash
rm -rf /workspace/containers/<service>
```

If unsure, leave the directory — it won't affect the running stack once removed from root compose.yml.
</step_8_directory>

<step_9_commit>
## Step 9: Commit

```bash
jj describe -m "remove <service>: <reason>"
jj bookmark set main -r @
jj git push
```
</step_9_commit>
</process>

<success_criteria>
- [ ] User confirmed removal (especially for data volumes)
- [ ] Service stopped
- [ ] Removed from root compose.yml
- [ ] Removed from Gatus config
- [ ] Removed from TsDproxy config (if applicable)
- [ ] Cloudflare tunnel updated (if applicable)
- [ ] Volume decision made and acted on
- [ ] Changes committed and pushed
</success_criteria>
