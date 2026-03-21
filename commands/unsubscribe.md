# /unsubscribe

Unsubscribe from a newsletter or mailing list using an unsubscribe URL.

Arguments passed: `$ARGUMENTS`

`$ARGUMENTS` should be the unsubscribe URL from the email. If no URL is provided, ask the user to paste the unsubscribe link before proceeding.

---

## Steps

### 1. Get the unsubscribe URL

If `$ARGUMENTS` is empty, ask:
> Please paste the unsubscribe URL from the email you want to unsubscribe from.

### 2. Resolve DNS blockers

The unsubscribe URL may be a click-tracking domain blocked by local DNS (e.g. AdGuard). Use the gluetun VPN container to bypass it:

```bash
docker exec gluetun wget -qO- --server-response "<url>" 2>&1
```

If the domain fails to resolve, check whether gluetun's internal DNS is blocking it:
- Look for `Name does not resolve` in the output
- If blocked, temporarily set `BLOCK_MALICIOUS: "off"` and `BLOCK_ADS: "off"` in `~/Workspace/containers/gluetun/compose.yml`, recreate the container, and retry once done revert the settings

### 3. Follow redirects to the unsubscribe form

Use `-L` / `--content-on-error` or follow the `Location:` header manually until reaching the actual unsubscribe page:

```bash
docker exec gluetun wget -qO- "<final-url>"
```

Inspect the HTML for:
- A form with a POST action
- Required fields (e.g. `$email`, `email`, `list_id`)
- Any hidden fields or CSRF tokens

### 4. Submit the unsubscribe request

Ask the user for their email address if a form field requires it. Do not guess or assume.

Submit the form via POST:

```bash
docker exec gluetun wget -qO- --post-data='<field>=<value>' "<form-action-url>"
```

A `200 OK` with an empty body or a confirmation message in the response body indicates success.

### 5. Confirm and report

Tell the user whether the unsubscription succeeded or if any further action is required (e.g. clicking a confirmation email).
