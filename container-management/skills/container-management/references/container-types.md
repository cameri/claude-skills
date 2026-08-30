<overview>
Two types of containers exist in `$CONTAINERS_ROOT` (from this plugin's `CLAUDE.md`). The update procedure differs significantly between them.
</overview>

<type_upstream>
**Upstream image (compose.yml only)**

No local build. The image is pulled from a registry.

Indicators:
- No `Containerfile` or `Dockerfile` in the service directory
- `compose.yml` has an `image:` field pointing to a public registry

Update goal:
- Move to the latest stable tag
- Pin the sha256 digest for reproducibility

Example before:
```yaml
image: nginx:1.25
```

Example after:
```yaml
image: nginx:1.27.3@sha256:c15da6c91de8d4d2...
```

How to resolve digest:
```bash
docker pull nginx:1.27.3
docker inspect --format='{{index .RepoDigests 0}}' nginx:1.27.3
# → nginx@sha256:c15da6c91de8d4d2...
# Strip the repo prefix to get just the digest
```
</type_upstream>

<type_custom>
**Custom image (has Containerfile or Dockerfile)**

Built locally from source. Two sub-types:

**Simple wrapper** — adds a few tools on top of an upstream image.
See this plugin's `CLAUDE.md` for this environment's custom-image services.

Update goals:
1. Update the base `FROM` image tag + pin its sha256
2. Update any explicitly pinned package/tool versions
3. Rebuild and verify the image works

**Source-built image** — builds from application source code (e.g., `<service>/source/Dockerfile`).
Update goals:
1. Update the base `FROM` image
2. Check if `npm install` / `pip install` / `go mod` produces newer deps
3. Rebuild and verify

**Reading the Dockerfile/Containerfile:**
- `FROM` line = base image to update
- `RUN apt-get install -y pkg=version` = pinned apt packages
- `RUN pip install pkg==version` = pinned pip packages
- `RUN apk add pkg=version` = pinned apk packages
- `ARG VERSION=x.y.z` = tool version argument to check

**Resolving base image sha256:**
```bash
docker pull debian:bookworm-slim
docker inspect --format='{{index .RepoDigests 0}}' debian:bookworm-slim
```
Then pin in the FROM line:
```dockerfile
FROM debian:bookworm-slim@sha256:abc123...
```
</type_custom>

<services_with_containerfiles>
Custom-image services (directories and image types in this plugin's `CLAUDE.md`). Verify with:
```bash
find $CONTAINERS_ROOT -name "Containerfile" -o -name "Dockerfile"
```
</services_with_containerfiles>
