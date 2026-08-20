# Workflow: Update a Container

<required_reading>
**Read these reference files NOW before proceeding:**
1. references/container-types.md
2. references/update-strategies.md
3. references/log-format.md
</required_reading>

<process>
<step_1_pick_target>
**If a container name was given:** use it.

**If no container was specified:**
1. Read `/workspace/containers/UPDATE-LOG.md`
2. List all service directories under `/workspace/containers/` (each subdir with a `compose.yml`)
3. Find the service with the oldest `last_updated` date in the log, or with no entry at all (treat missing as epoch 0)
4. Announce: "Updating `<service>` — last updated `<date>` (or never updated)."

Confirm with user before proceeding if the choice is non-obvious.
</step_1_pick_target>

<step_2_classify>
Determine the container type by checking the target directory:

- **Has `Containerfile` or `Dockerfile`** → custom image (needs build + run test)
- **compose.yml only** → upstream image (update tag + sha256 in compose.yml)

Read the relevant section of `references/container-types.md` for the type found.
</step_2_classify>

<step_3_snapshot>
Capture the current state before any changes:

```bash
# For compose images — record current image line
grep "image:" /workspace/containers/<service>/compose.yml

# For custom images — record Containerfile/Dockerfile content
cat /workspace/containers/<service>/Containerfile  # or Dockerfile
```

Save this snapshot mentally (or in a variable) for rollback.
</step_3_snapshot>

<step_4_update>
**For upstream compose images:**
1. Pull latest image metadata: `docker pull <image>:<tag>` (or check registry)
2. Resolve the sha256 digest: `docker inspect --format='{{index .RepoDigests 0}}' <image>:<tag>`
3. Find the latest stable tag if the current one is `latest` — prefer explicit versions
4. Update `compose.yml` with the pinned form: `image: <name>:<tag>@sha256:<digest>`

**For custom images (Containerfile/Dockerfile):**
1. Read the current base image (`FROM` line) and all package install commands
2. Check for newer base image tags (e.g., `debian:bookworm-slim` — look for newer patch releases)
3. Update the base image tag + pin its sha256
4. For `apt`, `apk`, `pip`, `npm` etc: update pinned versions if present, or note that versions are unpinned
5. Update the Containerfile/Dockerfile with the new versions

See `references/update-strategies.md` for per-package-manager guidance.
</step_4_update>

<step_5_test>
**For upstream compose images:**
```bash
cd /workspace/containers
docker compose pull <service>
docker compose up -d <service>
# Wait 15s then check health
sleep 15
docker ps --filter "name=<container_name>" --format "{{.Status}}"
```
Success: container shows `Up` and `(healthy)` if it has a healthcheck.

**For custom images:**
```bash
cd /workspace/containers/<service>
docker build -t <service>:test -f Containerfile .  # or Dockerfile
# If build succeeds, do a smoke-run
docker run --rm <service>:test <entry-or-version-flag> 2>&1 | head -5
# Then deploy
cd /workspace/containers
docker compose up -d --build <service>
sleep 15
docker ps --filter "name=<container_name>" --format "{{.Status}}"
```
</step_5_test>

<step_6_evaluate>
**If tests pass:**
- Commit the changes with jj: `jj describe -m "<service>: update image to <new-tag>@sha256:<short>"`
- Push: `jj bookmark set main -r @ && jj git push`
- Write a SUCCESS log entry (see `references/log-format.md`)

**If tests fail:**
- Revert files to snapshot state (restore original compose.yml / Containerfile)
- Restart the service: `docker compose up -d <service>`
- Write a FAILED log entry with the error details
- Do NOT commit the broken state
</step_6_evaluate>

<step_7_log>
Append to `/workspace/containers/UPDATE-LOG.md` using the format in `references/log-format.md`.

If the file doesn't exist yet, create it with the header first.
</step_7_log>
</process>

<success_criteria>
- [ ] Target container identified and announced
- [ ] Pre-change snapshot captured
- [ ] Image/dependencies updated (tag + sha256 pinned)
- [ ] Build succeeds (for custom images)
- [ ] Container is running and healthy after update
- [ ] Changes committed and pushed (or reverted on failure)
- [ ] Log entry appended to UPDATE-LOG.md
</success_criteria>
