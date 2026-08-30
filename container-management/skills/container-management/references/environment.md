<overview>
Infrastructure specifics for the containers/ repository. Read this before any workflow that involves networking, service dependencies, or update decisions.

**Environment values:** resolve `$CONTAINERS_ROOT` and the service/network inventory from this plugin's `CLAUDE.md` (plugin root, one level above `skills/`) — never hardcode paths or service lists. Host-level values (host IPs/ports, domains, webhook URLs) live in the workspace-local `docs/infra/container-management-environment.md`.
</overview>

<networks>
Three shared Docker networks are defined in the root `compose.yml` (network names, including Docker-level names, in this plugin's `CLAUDE.md`). Services connect to whichever they need:

| Network | Purpose |
|---------|---------|
| `gatus` | Internal monitoring — Gatus probes services on this network |
| `tsdproxy` | Tailscale exposure — TsDproxy creates TS machines for services here |
| `cloudflare` | Public access — Cloudflared tunnel routes traffic to services here |

**Rule:** Network definitions live in root `compose.yml` only. Never redefine them in individual service compose files.
</networks>

<external_dependencies>
Some services run on the host's own IP (not in Docker) rather than a container network — see your own `docs/infra/container-management-environment.md` (workspace-local, not shipped with this plugin) for the actual host/port table in your instance. Common candidates: Redis, PostgreSQL, MongoDB.

Services that depend on these connect directly by IP. Do not add them to Docker networks.
</external_dependencies>

<helper_scripts>
Located at `$CONTAINERS_ROOT/scripts/`:

- **`netshoot` skill** — launches a diagnostics container for network troubleshooting. Use the netshoot skill (not a repo-relative script path). Supports the `NETSHOOT_NETWORK` env var — use the Docker network name from this plugin's `CLAUDE.md`. Example: `NETSHOOT_NETWORK=<monitoring-network> netshoot curl http://<service>:<port>`
- **`pgdb`** — PostgreSQL database/user management on the host (see your `docs/infra/container-management-environment.md` for the actual address). Commands: `create-db`, `create-user`, `grant`, `list-db`, `list-users`, `list-tables`, `query`
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

Services known to be Watchtower-excluded: see this plugin's `CLAUDE.md`.
</watchtower>

<dozzle_groups>
All containers must have a `dev.dozzle.group` label for log organization. Valid group names (service membership in this plugin's `CLAUDE.md`):

- `Applications`
- `Admin Tools`
- `Monitoring`
- `Infrastructure`
- `Automation`
- `System`
- `AI`
- `Bots`
</dozzle_groups>

<public_access>
- **Cloudflare tunnels** (public): your own domains — see `docs/infra/container-management-environment.md`
- **Tailscale** (private): your own tailnet — all services with TsDproxy config
- **Host ports**: any host-networked service — see `docs/infra/container-management-environment.md` for the actual addresses
</public_access>

<gatus_monitoring>
Gatus config: `$CONTAINERS_ROOT/gatus/config/config.yaml`

- Hot-reloads on config change — no restart needed
- Alert providers: `telegram` and `custom` (webhook URL is workspace-local — see `docs/infra/container-management-environment.md`, never hardcode it here)
- Standard thresholds: failure-threshold 3, success-threshold 2, send-on-resolved true
- Higher thresholds (10/2): DNS services and heavy apps that are slower to stabilize

When adding a new service, add both `telegram` and `custom` alert types.
</gatus_monitoring>

<success_criteria>
- Correct network(s) selected for the service; networks defined only in root compose
- Dozzle group label set to a valid group
- Watchtower interplay checked before manual updates
- Environment-specific values (host ports, webhook URL, domains) taken from `docs/infra/container-management-environment.md`, never hardcoded
</success_criteria>
