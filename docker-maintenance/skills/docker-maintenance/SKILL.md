---
name: docker-maintenance
description: Maintain Docker Compose services and custom images. Update base images with sha256 pinning, manage Containerfile/Dockerfile package dependencies, test that images build and run correctly after changes, and keep an audit log. Use when asked to update containers, check for stale images, or manage container dependencies.
---

<essential_principles>
<one_at_a_time>
Always update ONE container per invocation. If no target is specified, pick the one with the oldest entry in the update log (or no entry at all). Never batch updates — each must be tested before proceeding to the next.
</one_at_a_time>

<containers_root>
All services live under `/workspace/containers/`. Each service has its own directory with a `compose.yml`. Some also have a `Containerfile` or `Dockerfile` for custom images.
</containers_root>

<update_log>
The update log lives at `/workspace/containers/UPDATE-LOG.md`. Every update attempt — successful or reverted — gets a log entry. This is the source of truth for "oldest updated."
</update_log>

<safety_first>
Before any change: capture the current state (image digest, file content). If the update fails testing, revert immediately and log the failure. Never leave a service broken.
</safety_first>

<sha256_pinning>
For compose images, prefer pinning with sha256 digest alongside the tag:
`image: nginx:1.27.3@sha256:abc123...`
This ensures reproducibility even if the tag is moved.
</sha256_pinning>

<version_control>
Use `jj` (not git) for all version control operations. See `/workspace/CLAUDE.md` for jj commands.
</version_control>
</essential_principles>

<intake>
What would you like to do?

1. **Update a container** — pick the oldest or specify one
2. **Check fleet health** — survey unhealthy/failing containers
3. **Add a new service** — full onboarding checklist
4. **Remove a service** — clean removal with Gatus/TsDproxy cleanup
5. **Manage Gatus** — add/remove/modify monitored endpoints or alert providers
6. **View update log** — see history of what was updated and when
7. **Initialize log** — create UPDATE-LOG.md if it doesn't exist yet

**Or just describe what you want and I'll route appropriately.**
</intake>

<routing>
| Response | Workflow |
|----------|----------|
| 1, "update", "maintain", container name given | `workflows/update-container.md` |
| 2, "health", "check", "status", "unhealthy" | `workflows/check-health.md` |
| 3, "add", "new service", "onboard" | `workflows/add-service.md` |
| 4, "remove", "delete", "uninstall" | `workflows/remove-service.md` |
| 5, "gatus", "monitor", "alert", "endpoint" | `workflows/manage-gatus.md` |
| 6, "log", "history", "view" | `workflows/view-log.md` |
| 7, "init", "initialize", "create log" | `workflows/view-log.md` (init section) |

**After reading the workflow, follow it exactly.**
</routing>

<reference_index>
**Container types and how to handle them:** references/container-types.md
**Update strategies and sha256 pinning:** references/update-strategies.md
**Log format and entry structure:** references/log-format.md
**Infrastructure specifics (networks, deps, Watchtower, Gatus):** references/environment.md
</reference_index>

<workflows_index>
| Workflow | Purpose |
|----------|---------|
| update-container.md | Full update cycle: pick target → update → test → log |
| check-health.md | Survey unhealthy containers and diagnose failures |
| add-service.md | Onboard a new service: compose, healthcheck, Gatus, TsDproxy |
| remove-service.md | Clean removal: compose, Gatus, TsDproxy, volumes |
| manage-gatus.md | Add/remove/modify Gatus endpoints and alert providers |
| view-log.md | Show update history; initialize log if missing |
</workflows_index>
