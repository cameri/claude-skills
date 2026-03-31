# /unsubscribe

Unsubscribe from a newsletter or mailing list using an unsubscribe URL.

Arguments passed: `$ARGUMENTS`

`$ARGUMENTS` should be the unsubscribe URL and optionally the email address (space-separated). If no URL is provided, ask the user to paste the unsubscribe link before proceeding.

---

## Steps

### 1. Get the unsubscribe URL

If `$ARGUMENTS` is empty, ask:
> Please paste the unsubscribe URL from the email you want to unsubscribe from.

Parse the email address from `$ARGUMENTS` if provided (second token after the URL). Do not ask for it yet — wait until you know whether the page requires it.

### 2. Resolve DNS blockers

The unsubscribe URL may be a click-tracking domain blocked by local DNS (e.g. AdGuard). Use the gluetun VPN container to bypass it:

```bash
docker exec gluetun wget -qO- --server-response "<url>" 2>&1
```

If the domain fails to resolve, check whether gluetun's internal DNS is blocking it:
- Look for `Name does not resolve` in the output
- If blocked, temporarily set `BLOCK_MALICIOUS: "off"` and `BLOCK_ADS: "off"` in `~/Workspace/containers/gluetun/compose.yml`, recreate the container, and retry once done revert the settings

### 3. Follow redirects to the unsubscribe page

Use `-L` / `--content-on-error` or follow the `Location:` header manually until reaching the actual unsubscribe page. Save the final page to a temp file for inspection:

```bash
docker exec gluetun sh -c 'wget -qO /tmp/unsub_page.html -L "<final-url>"'
```

### 4. Identify the unsubscribe mechanism

Inspect the page to determine which type of unsubscribe mechanism is used:

**Type A — HTML form (classic):**
- Look for `<form>` with a POST action
- Extract required fields (e.g. `email`, `list_id`) and hidden fields / CSRF tokens
- Submit via POST (see Step 5a)

**Type B — Client-side rendered (CSR) app:**
Signs: `BAILOUT_TO_CLIENT_SIDE_RENDERING`, Next.js app router, React with no server-rendered form, or button with `data-uia` / `onClick` handler.
- Download the page's JS bundles and search for the API call:
  ```bash
  # Find page-specific JS bundles
  grep -oE '_next/static/chunks/[^"]+\.js' /tmp/unsub_page.html
  # Download the relevant chunks and search for the endpoint
  docker exec gluetun sh -c 'wget -qO /tmp/chunk.js "<chunk-url>" && cat /tmp/chunk.js | tr "," "\n" | grep -i "fetch\|post\|put\|api\|url\|subscription\|unsubscribe\|opt_in" | head -30'
  ```
- Identify the HTTP method (GET/POST/PUT), endpoint URL, and required body fields
- Note any CORS requirements — add `Origin` and `Referer` headers matching the page domain

**Type C — GraphQL API (pre-persisted queries):**
Signs: requests to `/graphql`, `PersistedQueryNotFound` errors, `__meta__:{q:"..."}` in JS bundles.
- Pre-persisted query systems (e.g. Netflix) only accept whitelisted query hashes — sending arbitrary query text will fail with "Invalid Query"
- This requires browser execution; report to the user that manual action is needed

**Type D — Session-bound form (e.g. Salesforce):**
Signs: `ViewState`, `ViewStateMAC`, `ViewStateVersion` hidden fields.
- Use a cookie jar: GET the page first to capture session cookies and ViewState, then POST with the same session:
  ```bash
  docker exec gluetun sh -c 'wget -qO /tmp/sf_page.html --save-cookies /tmp/cookies.txt "<url>" && \
    VS=$(grep -oE 'value="[^"]{100,}"' /tmp/sf_page.html | head -1 | cut -d\" -f2) && \
    wget -qO- --load-cookies /tmp/cookies.txt --post-data="..._ViewState=${VS}&..." "<form-action>"'
  ```

### 5a. Submit HTML form

```bash
docker exec gluetun wget -qO- --post-data='<field>=<value>' "<form-action-url>"
```

### 5b. Submit CSR API call

Add `Origin` and `Referer` headers to match the page domain (required for CORS):

```bash
docker exec gluetun sh -c 'wget -qO- \
  --header="Content-Type: application/json" \
  --header="Origin: https://<page-domain>" \
  --header="Referer: https://<page-domain>/<path>" \
  --method=<METHOD> \
  --body-data='"'"'{"field": "value"}'"'"' \
  "<api-endpoint>"'
```

A `200 OK` with a success message confirms the unsubscription.

### 6. Confirm and report

Tell the user whether the unsubscription succeeded or if manual action is required (e.g. clicking a confirmation email, or opening the URL in a browser for JS-only flows).
