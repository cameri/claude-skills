# Workflow: Add a New Service

<required_reading>
**Read these reference files NOW before proceeding:**
1. references/environment.md
2. references/container-types.md
</required_reading>

<process>
<step_1_create_directory>
## Step 1: Create the service directory and compose.yml

```bash
mkdir /workspace/containers/<service>
```

Create `compose.yml` with:
- `image:` — use explicit semver tag, not `latest`
- `container_name:` — required, follow `service-role` naming (e.g. `immich-server`)
- `labels:` — add `dev.dozzle.group` (see references/environment.md for valid groups)
- `networks:` — connect to `gatus` at minimum; add `tsdproxy` if Tailscale access needed; add `cloudflare` if public access needed
- `environment:` — use object format (`KEY: VALUE`), not array format (`- KEY=VALUE`)
- `restart: unless-stopped`
- `healthcheck:` — see Step 4

Key ordering convention: `image` → `container_name` → `labels` → `env_file` → `environment` → `volumes` → `networks` → `restart` → `healthcheck`
</step_1_create_directory>

<step_2_add_to_root>
## Step 2: Add to root compose.yml

Edit `/workspace/containers/compose.yml` and add to the `include:` list:

```yaml
include:
  - <service>/compose.yml   # add in alphabetical or logical order
```
</step_2_add_to_root>

<step_3_healthcheck>
## Step 3: Add a Docker healthcheck

Choose the simplest method available in the container:

| Method | When to use | Example |
|--------|-------------|---------|
| `curl -f` | curl is available | `["CMD", "curl", "-f", "http://127.0.0.1:PORT"]` |
| `wget -qO-` | wget is available, no curl | `["CMD", "wget", "-qO-", "http://127.0.0.1:PORT"]` |
| `nc -z` | TCP-only, nc available | `["CMD", "nc", "-z", "127.0.0.1", "PORT"]` |
| `bash /dev/tcp` | only bash available | `["CMD-SHELL", "timeout 1 bash -c '</dev/tcp/127.0.0.1/PORT'"]` |
| `php fsockopen` | PHP container | `["CMD-SHELL", "php -r 'exit(@fsockopen(\"127.0.0.1\",PORT)?0:1);'"]` |

**Always use `127.0.0.1` not `localhost`** (avoids IPv6 issues).

Standard config:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://127.0.0.1:PORT"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s  # increase to 30s for slow-starting services
```

Test the healthcheck manually before adding:
```bash
docker run --rm <image> curl -f http://127.0.0.1:PORT
```
</step_3_healthcheck>

<step_4_gatus>
## Step 4: Add Gatus monitoring

Edit `/workspace/containers/gatus/config/config.yaml`.

Add an endpoint entry. Use the appropriate protocol:

**HTTP service:**
```yaml
  - name: "Service Name"
    group: "Group Name"   # matches Dozzle group
    url: "http://<container_name>:<port>"
    interval: 1m
    conditions:
      - "[STATUS] == 200"
      - "[RESPONSE_TIME] < 2000"
    alerts:
      - type: telegram
        enabled: true
        send-on-resolved: true
        failure-threshold: 3
        success-threshold: 2
      - type: custom
        enabled: true
        send-on-resolved: true
        failure-threshold: 3
        success-threshold: 2
```

**TCP service:**
```yaml
  - name: "Service Name"
    group: "Group Name"
    url: "tcp://<host>:<port>"
    interval: 1m
    conditions:
      - "[CONNECTED] == true"
      - "[RESPONSE_TIME] < 1000"
    alerts:
      - type: telegram
        ...
      - type: custom
        ...
```

Use higher thresholds (failure-threshold: 10) for services that take longer to stabilize (DNS, heavy apps).

Gatus hot-reloads — no restart needed.
</step_4_gatus>

<step_5_tsdproxy>
## Step 5: Add TsDproxy config (if Tailscale access needed)

Add the service to the appropriate file in `/workspace/containers/tsdproxy/config/`:
- `applications.yaml` — user-facing apps
- `admin-tools.yaml` — admin/management UIs
- `infrastructure.yaml` — monitoring/infrastructure
- `automation.yaml` — automation services

Entry format:
```yaml
<subdomain>:
  url: http://<container_name>:<port>
  dashboard:
    label: "Display Name"
    icon: "sh/icon-name"   # selfh.st icons, or mdi/ or si/
```

The service must be on the `tsdproxy` network.
</step_5_tsdproxy>

<step_6_cloudflare>
## Step 6: Add Cloudflare tunnel config (if public access needed)

Use the Cloudflare API via netshoot to update the tunnel ingress:

```bash
./scripts/netshoot sh -c 'curl -s -X PUT \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${CLOUDFLARE_TUNNEL_ID}/configurations" \
  -d "{\"config\":{\"ingress\":[...existing entries...,{\"service\":\"http://<container>:<port>\",\"hostname\":\"subdomain.domain.com\"},{\"service\":\"http_status:404\"}]}}"'
```

The service must be on the `cloudflare` network.
</step_6_cloudflare>

<step_7_test>
## Step 7: Test the service

```bash
cd /workspace/containers
docker compose up -d <service>
sleep 15
docker ps --filter "name=<container_name>" --format "table {{.Names}}\t{{.Status}}"
docker logs <container_name> --tail 20
```

Verify:
- Container is `Up` and `(healthy)` if healthcheck is set
- No errors in logs
- Gatus shows the endpoint (check after ~1 minute)
- TsDproxy exposes the service (run `tailscale status` to confirm)
</step_7_test>

<step_8_commit>
## Step 8: Commit

```bash
jj describe -m "add <service>: <brief description>"
jj bookmark set main -r @
jj git push
```
</step_8_commit>
</process>

<success_criteria>
- [ ] compose.yml created with container_name, dozzle label, correct networks, healthcheck
- [ ] Added to root compose.yml include list
- [ ] Healthcheck verified working
- [ ] Gatus endpoint added with both telegram and custom alerts
- [ ] TsDproxy config added (if applicable)
- [ ] Cloudflare tunnel updated (if applicable)
- [ ] Container running and healthy
- [ ] Changes committed and pushed
</success_criteria>
