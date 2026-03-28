---
name: manage-blocking
description: Manage DNS blocking on a Technitium DNS Server — check if a domain is blocked or allowed, add/remove per-domain block or allow overrides, and manage block list URLs. Use when the user wants to block a domain, whitelist a domain, check filter status, or manage block lists.
user-invocable: true
allowed-tools:
  - Read
  - Bash(http *)
  - Bash(source *)
---

<objective>
Manages Technitium DNS Server blocking — per-domain allow/block overrides, block list URL management, and global blocking toggle. Also checks whether a specific domain is effectively blocked or allowed.
</objective>

<quick_start>
```
/technitium-dns:manage-blocking check example.com
/technitium-dns:manage-blocking allow add example.com
/technitium-dns:manage-blocking allow remove example.com
/technitium-dns:manage-blocking allow list
/technitium-dns:manage-blocking block add malware.example.com
/technitium-dns:manage-blocking block remove malware.example.com
/technitium-dns:manage-blocking block list
/technitium-dns:manage-blocking blocklists
/technitium-dns:manage-blocking blocklists add https://somehost.com/blocklist.txt
/technitium-dns:manage-blocking blocklists remove https://somehost.com/blocklist.txt
/technitium-dns:manage-blocking blocklists update
/technitium-dns:manage-blocking enable
/technitium-dns:manage-blocking disable
```
</quick_start>

<context>
Parse `env=<name>` from `$ARGUMENTS` before any other processing. Strip it from remaining arguments. Default to `""` (empty string). Credential file: `~/.claude/channels/technitium-dns/${ENV}.env`. Omit `env=` from suggested commands when ENV is empty.

Load credentials from the env file. If missing or `TECHNITIUM_URL` is not set, tell the user to run `/technitium-dns:configure-technitium` first.

**Auth token resolution** (before every API call):
- If `TECHNITIUM_TOKEN` is set, use it directly as `$TOKEN`.
- Otherwise call `/api/user/login` with `TECHNITIUM_USER`/`TECHNITIUM_PASSWORD` and parse the `token` field.
</context>

<workflow>
Parse the first word of remaining arguments as the subcommand. Parse the second word as a sub-subcommand where applicable.

---

### `check <domain>`

Check whether a domain is on the allow list, the block list, or neither — and do a live resolve to show the effective result.

Run these three calls in sequence:

**1. Check allow list:**
```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/allowed/list" \
  token=="$TOKEN" domain=="<domain>"
```

**2. Check block list:**
```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/blocked/list" \
  token=="$TOKEN" domain=="<domain>"
```

**3. Live resolve (effective result):**
```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/dnsClient/resolve" \
  token=="$TOKEN" server=="this-server" domain=="<domain>" type=="A" protocol=="UDP"
```

Display a summary table:

| Field | Value |
|---|---|
| Domain | `<domain>` |
| Allow override | Yes / No |
| Block override | Yes / No |
| Effective result | Blocked / Allowed / (resolved IP or NXDOMAIN) |

Determine "Effective result" from the live resolve response:
- If the answer contains `0.0.0.0` or `::` → **Blocked** (AnyAddress blocking)
- If the RCODE is `NXDomain` and no records → **Blocked** (NxDomain blocking)
- If the answer contains a real IP → **Allowed** (show the IP)
- If the answer is empty and RCODE is `NoError` → **Allowed** (no records, but not blocked)

Note: a domain can be on the allow list but still appear blocked if blocking is disabled or the entry is overridden. The live resolve shows the ground truth.

---

### `allow add <domain>`

Add a domain to the per-domain allow list (whitelist override — bypasses block lists):

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/allowed/add" \
  token=="$TOKEN" domain=="<domain>"
```

Confirm success with: `"<domain>" added to the allow list.`

---

### `allow remove <domain>`

Remove a domain from the per-domain allow list:

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/allowed/delete" \
  token=="$TOKEN" domain=="<domain>"
```

Confirm success with: `"<domain>" removed from the allow list.`

---

### `allow list`

List all per-domain allow overrides:

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/allowed/list" \
  token=="$TOKEN"
```

Display as a sorted list of domain names. Show the total count. If empty, say "No allowed domains configured."

---

### `block add <domain>`

Add a domain to the per-domain block list (manual block override):

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/blocked/add" \
  token=="$TOKEN" domain=="<domain>"
```

Confirm success with: `"<domain>" added to the block list.`

---

### `block remove <domain>`

Remove a domain from the per-domain block list:

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/blocked/delete" \
  token=="$TOKEN" domain=="<domain>"
```

Confirm success with: `"<domain>" removed from the block list.`

---

### `block list`

List all per-domain block overrides:

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/blocked/list" \
  token=="$TOKEN"
```

Display as a sorted list of domain names. Show the total count. If empty, say "No blocked domains configured."

---

### `blocklists`

Show current block list configuration:

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/settings/get" \
  token=="$TOKEN"
```

From the response, display:

| Field | Value |
|---|---|
| Blocking enabled | Yes / No |
| Blocking type | AnyAddress / NxDomain / CustomAddress |
| Update interval | `<blockListUpdateIntervalHours>` hours |
| Next update | `<blockListNextUpdatedOn>` |
| Block list URLs | (numbered list, one per line) |

If no URLs are configured, say "No block list URLs configured."

---

### `blocklists add <url>`

Add a URL to the block list. Fetch current settings first to get the existing URL list, append the new URL, then save:

```
# 1. Get current block list URLs
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/settings/get" token=="$TOKEN"

# 2. Build new comma-separated list: existing URLs + <url>

# 3. Save updated list
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/settings/set" \
  token=="$TOKEN" blockListUrls=="<comma-separated-urls>"
```

Confirm success with: `Block list URL added. Run 'blocklists update' to download it now.`

---

### `blocklists remove <url>`

Remove a URL from the block list. Fetch current settings first, remove the matching URL, then save:

```
# 1. Get current block list URLs
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/settings/get" token=="$TOKEN"

# 2. Build new comma-separated list: existing URLs minus <url>

# 3. If the list would become empty, use blockListUrls=="false" to clear all
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/settings/set" \
  token=="$TOKEN" blockListUrls=="<comma-separated-urls or false>"
```

If the URL is not in the current list, say so and abort.

Confirm success with: `Block list URL removed.`

---

### `blocklists update`

Force an immediate download/refresh of all configured block lists:

```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/settings/forceUpdateBlockLists" \
  token=="$TOKEN"
```

Confirm success with: `Block lists are being updated in the background.`

---

### `enable`

Enable DNS blocking globally:

```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/settings/set" \
  token=="$TOKEN" enableBlocking=="true"
```

Confirm: `DNS blocking enabled.`

---

### `disable [minutes=<n>]`

Disable DNS blocking. If `minutes=<n>` is provided, disable temporarily:

**Temporary:**
```
http --ignore-stdin -b GET "${TECHNITIUM_URL%/}/api/settings/temporaryDisableBlocking" \
  token=="$TOKEN" minutes=="<n>"
```
Confirm: `DNS blocking temporarily disabled for <n> minute(s).`

**Permanent:**
```
http --ignore-stdin -b POST "${TECHNITIUM_URL%/}/api/settings/set" \
  token=="$TOKEN" enableBlocking=="false"
```
Confirm: `DNS blocking disabled.`

</workflow>

<notes>
- Domain names should not have a trailing dot — strip it if present.
- The allow list is a whitelist that lets domains bypass block list rules. The block list is a manual blacklist that blocks domains regardless of block lists.
- Block list URLs added here apply to the globally downloaded block lists (hosts format or plain domain lists). Per-domain overrides (allow/block) take effect immediately without a list update.
- If `"status": "invalid-token"`, tell the user the session expired.
- If `"status": "error"`, show `errorMessage`.
- For `check`, all three API calls can be made in parallel to speed up the response.
</notes>

<success_criteria>
- `check` shows allow status, block status, and live resolve result in one table
- `allow`/`block` add/remove/list operations work correctly and confirm success
- `blocklists` shows current URLs and blocking status in a table
- `blocklists add/remove` reads current settings before modifying to avoid clobbering other URLs
- `enable`/`disable` toggle global blocking with optional temporary duration
- API errors surfaced with actionable messages
</success_criteria>
