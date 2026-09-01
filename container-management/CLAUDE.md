# container-management Plugin Configuration

This file is the authoritative source for environment-specific values used by the container-management skills: the containers root path, the service inventory (Dozzle groups, Watchtower-excluded services, custom-image services), and the Docker network names. Update this file when adding, removing, or changing services or networks — skills read from here at runtime instead of hardcoding.

Host-level values (host IPs/ports for services not in Docker, public domains, webhook URLs) are workspace-local and live in `docs/infra/container-management-environment.md` (not shipped with this plugin).

## Containers Root

| Value | Path |
|-------|------|
| Containers root (`$CONTAINERS_ROOT`) | `/workspace/containers/` |
| Update log | `/workspace/containers/UPDATE-LOG.md` |
| Root compose | `/workspace/containers/compose.yml` |
| Helper scripts | `/workspace/containers/scripts/` |
| Gatus config | `/workspace/containers/gatus/config/config.yaml` |
| TsDproxy config | `/workspace/containers/tsdproxy/config/` |

## Docker Networks

Shared networks are defined in the root `compose.yml` only — never redefined in per-service files. Docker-level network names follow the `<project>_<network>` pattern (`containers_` prefix for this stack).

| Compose network | Docker network name | Purpose |
|-----------------|---------------------|---------|
| `gatus` | `containers_gatus` | Internal monitoring — Gatus probes services on this network |
| `tsdproxy` | `containers_tsdproxy` | Tailscale exposure — TsDproxy creates TS machines for services here |
| `cloudflare` | `containers_cloudflare` | Public access — Cloudflared tunnel routes traffic to services here |
| `experiential` | `containers_experiential` | Model gateway — claude-ricardo reaches the experiential gateway on this network |

## Service Inventory

### Dozzle groups (`dev.dozzle.group` label)

| Group | Services |
|-------|----------|
| `Applications` | immich, wallabag, freshrss, paperless-ngx, actual-budget, etc. |
| `Admin Tools` | pgadmin4, cloudbeaver, mongoku, portainer, forgejo, dozzle |
| `Monitoring` | gatus, beszel, grafana-alloy |
| `Infrastructure` | cloudflared, gluetun, tsdproxy, nats, chrony |
| `Automation` | node-red, home-assistant |
| `System` | watchtower, sops sidecars, proton-bridge |
| `AI` | claude-sandboxed, experiential |
| `Bots` | akkadian-agent |

### Watchtower-excluded services

Updated manually — always pin sha256:

- SOPS sidecars: `alby-hub-sops`, `cloudflared-sops`

### Custom-image services

| Service directory | Image type |
|-------------------|------------|
| `claude-sandboxed/` | Containerfile (simple wrapper) |
| `cloudflared/` | Containerfile (simple wrapper) |
| `sops/` | Containerfile (simple wrapper) |
| `experiential/` | Containerfile (custom; pins `EXPERIENTIAL_VERSION`, bundles sops) |
| `mongoku/source/` | Dockerfile (source-built, compose uses `build:`) |
| `relaymon/source/` | may have Dockerfile (disabled service, check before updating) |
