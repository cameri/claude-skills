<overview>
Strategies for finding newer versions and pinning them safely.
</overview>

<finding_newer_tags>
**Docker Hub images:**
```bash
# Pull latest and inspect
docker pull <image>:latest
docker inspect --format='{{index .RepoDigests 0}}' <image>:latest

# List available tags (requires crane or skopeo if available)
# Fallback: check hub.docker.com manually or use WebSearch
```

**GitHub Container Registry (ghcr.io):**
- Check the package page on github.com for the repo
- Tags follow the upstream release cadence

**Tag selection rules:**
- Prefer explicit semver tags over `latest` (e.g., `1.27.3` over `latest`)
- Prefer `-slim` or `-alpine` variants when available to reduce attack surface
- Avoid `-rc`, `-beta`, `-alpha` unless explicitly requested
- For services tagged as `latest` with no pinned version, find the current concrete version first
</finding_newer_tags>

<sha256_pinning>
After picking a tag, always pin the digest:

```bash
# Pull the tag
docker pull nginx:1.27.3

# Get the digest
docker inspect --format='{{index .RepoDigests 0}}' nginx:1.27.3
# Output: nginx@sha256:c15da6c91de8d4d2e92d...

# Use in compose.yml:
image: nginx:1.27.3@sha256:c15da6c91de8d4d2e92d...
```

Why: tags are mutable. A sha256 digest is immutable. Pinning both gives you readable intent + reproducible pulls.
</sha256_pinning>

<package_managers>
**apt (Debian/Ubuntu):**
```bash
# Inside a running container or via docker run --rm
apt-cache policy <package>   # shows installed and candidate versions
apt-cache madison <package>  # shows all available versions
# Pin format in Dockerfile:
RUN apt-get install -y package=1.2.3-1
```

**apk (Alpine):**
```bash
apk info <package>           # show installed version
# Check: https://pkgs.alpinelinux.org/packages
# Pin format:
RUN apk add --no-cache package=1.2.3-r0
```

**pip:**
```bash
pip index versions <package>   # list all versions
# Pin format:
RUN pip install package==1.2.3
```

**npm/bun:**
- Check npmjs.com for latest version
- Pin in Dockerfile: `RUN npm install -g package@1.2.3`

**curl-installed binaries (e.g. specific tool versions):**
- Common pattern: `ARG TOOL_VERSION=x.y.z`
- Check the tool's GitHub releases page for the latest stable tag
- Update the ARG value
</package_managers>

<testing_strategy>
**Upstream images (quick):**
```bash
docker compose pull <service>
docker compose up -d <service>
sleep 15
docker ps --filter "name=<name>" --format "table {{.Names}}\t{{.Status}}"
```

**Custom images (thorough):**
```bash
# 1. Build test image (don't tag as :latest yet)
docker build -t <service>:test -f Containerfile . 2>&1 | tail -20

# 2. Smoke test — run a quick command to verify the binary works
docker run --rm <service>:test <binary> --version

# 3. If smoke test passes, deploy
docker compose up -d --build <service>
sleep 20
docker ps --filter "name=<name>" --format "table {{.Names}}\t{{.Status}}"

# 4. Check logs for startup errors
docker logs <container_name> --tail 20
```

**Healthcheck pass criteria:**
- Container status contains `(healthy)` — healthcheck passed
- Container status is `Up Xs` with no `(unhealthy)` — no healthcheck, check logs manually
</testing_strategy>

<self_rebuild_gotcha>
**Running `docker compose ... --build <service>` from inside a container,
targeting that same container or a sibling on the same Docker host:** the
compose file's `${HOME}`-style variables resolve against the environment of
whatever process invokes `docker compose` — not the real host's — even
though the bind-mount operations themselves happen on the real host via the
mounted `docker.sock`. If the container's own `$HOME` differs from the real
host's (e.g. a container running as a different user than whoever owns the
host paths in `compose.yml`), Docker silently auto-creates the missing
bind-mount source directories under the *wrong* path instead of erroring —
producing a container with empty, disconnected mounts instead of its real
data. This bit twice during the 2026-08 tmux→herdr container migration (see
`docs/superpowers/plans/2026-08-23-herdr-claude-gina-cutover.md` incident 4
and `docs/superpowers/plans/2026-08-24-herdr-claude-ricardo-cutover.md`).

Fix: render the compose file with the *correct* `HOME` into a temp file
first, then apply that rendered file using the *normal* (session's own)
environment — the `docker`/`buildx` CLI itself also needs its own correct
`$HOME` to find its local state (e.g. `~/.docker/buildx/...`), so setting
`HOME` for the whole `--build` invocation breaks that instead:

```bash
HOME=<correct-host-home> docker compose config > /tmp/resolved.yml
docker compose -f /tmp/resolved.yml up -d --build <service>
```

If the target is the very container running the current session, this
command cannot safely run from inside that session at all — it tears down
the process running it. Hand the exact command to a human at a real host
shell instead, and treat any follow-up verification as a fresh
conversation's job (see the `claude-ricardo` plan above for the pattern of
splitting "safe prep, run from inside" from "the actual recreate, handed
off").
</self_rebuild_gotcha>

<rollback>
If testing fails:

1. Restore the original file content (from snapshot taken in step 3)
2. Redeploy original:
   ```bash
   docker compose up -d <service>     # for compose images
   docker compose up -d --build <service>  # for custom images
   ```
3. Verify the service is back up
4. Log the failure with error details
5. Do NOT commit broken changes
</rollback>
