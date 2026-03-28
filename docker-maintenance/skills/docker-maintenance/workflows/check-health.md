# Workflow: Check Fleet Health

<required_reading>
**Read these reference files NOW before proceeding:**
1. references/environment.md
</required_reading>

<process>
<step_1_container_status>
## Step 1: Check container health status

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" | sort
```

Look for:
- `(unhealthy)` — healthcheck is failing
- `(health: starting)` — still initializing (wait and recheck)
- `Restarting` — container is crash-looping
- Missing containers — expected services that aren't running

Also check for containers that exited:
```bash
docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"
```
</step_1_container_status>

<step_2_cross_reference_gatus>
## Step 2: Cross-reference with Gatus

Check Gatus logs for recent failures:
```bash
docker logs gatus --tail 50 2>&1 | grep "success=false"
```

This shows which endpoints Gatus currently sees as failing, which may differ from container health (e.g., a container can be `healthy` but serve bad responses).
</step_2_cross_reference_gatus>

<step_3_diagnose>
## Step 3: Diagnose unhealthy containers

For each unhealthy or failed container:

```bash
# Check recent logs
docker logs <container_name> --tail 30

# Check healthcheck details
docker inspect <container_name> | grep -A 10 '"Health"'

# Check resource usage (OOM kills, CPU spikes)
docker stats <container_name> --no-stream
```

Common causes:
| Symptom | Likely cause |
|---------|-------------|
| `connection refused` | Service not started yet or crashed |
| `OOMKilled` | Container ran out of memory |
| `no such host` | DNS resolution failure — check if service is on the right network |
| `dial tcp ... connect: refused` | Dependency not running (DB, Redis) |
| healthcheck exits non-zero | Health endpoint returning error |
</step_3_diagnose>

<step_4_report>
## Step 4: Report findings

Summarize:
- Total containers running vs expected
- Unhealthy containers with reason
- Crash-looping containers
- Gatus-detected failures that don't have a matching unhealthy container
- Recommended actions for each issue

If everything is healthy, confirm: "All containers running and healthy."
</step_4_report>

<step_5_remediate>
## Step 5: Remediate (if user asks)

**Restart a specific service:**
```bash
cd /workspace/containers
docker compose restart <service>
```

**Recreate (picks up config changes):**
```bash
docker compose up -d <service>
```

**View live logs:**
```bash
docker compose logs -f <service>
```

**Network troubleshooting:**
```bash
NETSHOOT_NETWORK=containers_gatus ../projects/claude-skills/netshoot/scripts/netshoot curl http://<container_name>:<port>
```
</step_5_remediate>
</process>

<success_criteria>
- [ ] All containers checked for health status
- [ ] Gatus failures cross-referenced
- [ ] Unhealthy containers diagnosed with root cause
- [ ] Summary report provided
- [ ] Remediation steps taken if requested
</success_criteria>
