<overview>
Infrastructure specifics for the containers/ repository. Read this before any workflow that involves networking, service dependencies, or update decisions.
</overview>

<networks>
Three shared Docker networks are defined in the root `compose.yml`. Services connect to whichever they need:

| Network | Purpose |
|---------|---------|
| `gatus` | Internal monitoring — Gatus probes services on this network |
| `tsdproxy` | Tailscale exposure — TsDproxy creates TS machines for services here |
| `cloudflare` | Public access — Cloudflared tunnel routes traffic to services here |

**Rule:** Network definitions live in root `compose.yml` only. Never redefine them in individual service compose files.
</networks>

<external_dependencies>
These services run on `10.0.6.2` (the host), not in Docker:

| Service | Address |
|---------|---------|
| Redis | `10.0.6.2:6379` |
| PostgreSQL | `10.0.6.2:5432` |
| MongoDB | `10.0.6.2:27017` |

Services that depend on these connect directly by IP. Do not add them to Docker networks.
</external_dependencies>

<helper_scripts>
Located at `/workspace/containers/scripts/`:

- **`netshoot` skill** — launches a diagnostics container for network troubleshooting. Script at `projects/claude-skills/netshoot/scripts/netshoot`. Supports `NETSHOOT_NETWORK` env var. Example: `NETSHOOT_NETWORK=containers_gatus ../projects/claude-skills/netshoot/scripts/netshoot curl http://forgejo:3000`
- **`pgdb`** — PostgreSQL database/user management on 10.0.6.2. Commands: `create-db`, `create-user`, `grant`, `list-db`, `list-users`, `list-tables`, `query`
- **`bw`** — Bitwarden secrets retrieval. Auto-unlocks vault using credentials from `.env`. Commands: `search`, `get`, `password`, `username`, `field`, `list`, `sync`
- **`scan`** / **`scan-batch`** — container image security scanning via HarborGuard
- **`scan-secrets`** — secret scanning in files
</helper_scripts>

<watchtower>
Watchtower automatically updates containers that don't opt out. When updating a service manually, check whether Watchtower manages it:

```bash
docker inspect <container_name> | grep -i watchtower
```

- **Watchtower-managed** (`com.centurylinklabs.watchtower.enable` absent or `true`): Watchtower will pull and restart the container automatically. Manual sha256 pinning will be overwritten. Consider whether pinning is appropriate.
- **Watchtower-excluded** (`com.centurylinklabs.watchtower.enable=false`): Must be updated manually. Always pin sha256.

Services known to be Watchtower-excluded: SOPS sidecars (alby-hub-sops, cloudflared-sops).
</watchtower>

<dozzle_groups>
All containers must have a `dev.dozzle.group` label for log organization:

| Group | Services |
|-------|---------|
| `Applications` | immich, wallabag, freshrss, paperless-ngx, actual-budget, etc. |
| `Admin Tools` | pgadmin4, cloudbeaver, mongoku, portainer, forgejo, dozzle |
| `Monitoring` | gatus, beszel, grafana-alloy |
| `Infrastructure` | cloudflared, gluetun, tsdproxy, nats, chrony |
| `Automation` | node-red, home-assistant |
| `System` | watchtower, sops sidecars, proton-bridge |
| `AI` | claude-sandboxed |
| `Bots` | akkadian-agent |
</dozzle_groups>

<public_access>
- **Cloudflare tunnels** (public): `status.tnsor.network`, `nostrcheck.tnsor.network`, `blog.ricardocabral.io`
- **Tailscale** (private, `*.panther-lizard.ts.net`): all services with TsDproxy config
- **Host ports**: Akkadian Agent on `10.0.6.2:3000`
</public_access>

<gatus_monitoring>
Gatus config: `/workspace/containers/gatus/config/config.yaml`

- Hot-reloads on config change — no restart needed
- Alert providers: `telegram` and `custom` (webhook to `http://10.0.6.2:3456/webhook/f37af80f`)
- Standard thresholds: failure-threshold 3, success-threshold 2, send-on-resolved true
- Higher thresholds (10/2): DNS services, Immich (slower to stabilize)

When adding a new service, add both `telegram` and `custom` alert types.
</gatus_monitoring>
