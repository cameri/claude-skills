# netshoot Plugin Configuration

This file is the authoritative source for deployment-specific values used by the netshoot skill.
Update this file when the container stack moves, its networks change, or services are added or removed — the skill reads these values from here instead of hardcoding them.

## Container Stack Directory

The netshoot script loads `.env` from its working directory via `--env-file .env`, so it must be run from the container stack root:

- Stack root: `/workspace/containers/`

The bundled script ships at the plugin root (`/workspace/projects/skills/netshoot/scripts/netshoot`). From the stack directory, invoke it by its path, e.g.:

```bash
cd /workspace/containers/
../projects/skills/netshoot/scripts/netshoot curl http://<service>:<port>
```

## Docker Networks

This environment's compose-project networks (project `containers` + service networks). Discover current networks at runtime with `docker network ls`.

| Network | Purpose |
|---------|---------|
| `containers_gatus` | `gatus` uptime-monitoring network |
| `containers_tsdproxy` | `tsdproxy` reverse-proxy network |
| `containers_cloudflare` | `cloudflared` tunnel network |

## Services

Service names in this environment's stack, reachable by name on their compose network:

| Service | Purpose |
|---------|---------|
| `forgejo` | Git server (HTTP on port 3000) |
| `gatus` | Uptime monitoring |
| `immich-server` | Photo server |

## .env

The stack root holds `.env`, the compose project's environment file. If it is missing, the netshoot script skips `--env-file .env` and runs without it; recreate `.env` from the stack's template or backup when the target service needs values from it.
