<overview>
The update log lives at `/workspace/containers/UPDATE-LOG.md`. Every update attempt is recorded here — successful or not.
</overview>

<file_header>
Create with this header if the file doesn't exist:

```markdown
# Container Update Log

> Managed by the `docker-maintenance` skill.
> One entry per update attempt. Format: date, service, type, changes, result.

---
```
</file_header>

<entry_format>
Each entry uses this structure:

```markdown
## <service> — <YYYY-MM-DD>

**Type:** upstream | custom-image
**Result:** ✅ success | ❌ failed | ⏪ reverted

**Changes:**
- `image`: `old-tag` → `new-tag@sha256:short`   (for upstream)
- `FROM`: `old-base` → `new-base@sha256:short`    (for custom)
- `TOOL_VERSION`: `1.2.3` → `1.4.0`              (for ARG bumps)
- `package=old` → `package=new`                   (for pinned packages)

**Test result:** Container healthy after 15s | Build failed: <error summary> | Startup failed: <error>

**Notes:** <optional — anything non-obvious about this update>

---
```
</entry_format>

<examples>
**Successful upstream update:**
```markdown
## nginx — 2026-03-25

**Type:** upstream
**Result:** ✅ success

**Changes:**
- `image`: `nginx:1.25` → `nginx:1.27.3@sha256:c15da6c91de8`

**Test result:** Container healthy after 15s

---
```

**Failed custom image update:**
```markdown
## sops — 2026-03-25

**Type:** custom-image
**Result:** ❌ failed → ⏪ reverted

**Changes attempted:**
- `FROM`: `debian:bookworm-slim` → `debian:bookworm-20250317-slim@sha256:abc123`
- `SOPS_VERSION`: `3.8.1` → `3.9.2`

**Test result:** Build failed — checksum mismatch for sops binary download

**Notes:** sops 3.9.2 release asset URL changed. Reverted to 3.8.1.

---
```
</examples>

<picking_oldest>
To find the oldest-updated container:

1. Read UPDATE-LOG.md
2. Extract the most recent date per service (a service may have multiple entries)
3. List all service directories under `/workspace/containers/` (dirs containing compose.yml)
4. Services with no entries in the log are treated as "never updated" (oldest priority)
5. Among services with entries, pick the one with the earliest last-updated date
</picking_oldest>
