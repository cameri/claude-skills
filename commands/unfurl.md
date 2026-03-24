---
description: Resolve a minified or tracking URL to its final destination, following all redirects through the gluetun VPN to bypass DNS blocks
argument-hint: <url>
allowed-tools:
  - Bash(docker exec gluetun *)
  - Bash(docker compose *)
  - Read
  - Edit
---

<objective>
Resolve `$ARGUMENTS` to its true final destination by following all HTTP redirects.

Tracking and minified URLs (bit.ly, t.co, click.mailchimp.com, etc.) hide the real
link behind one or more redirect hops. This command follows the full chain and
returns the clean final URL — stripping common tracking parameters
(utm_*, fbclid, mc_eid, etc.) from the result.

Uses the gluetun VPN container to bypass domains blocked by local DNS (AdGuard).
</objective>

<process>
1. **Get the URL**

   If `$ARGUMENTS` is empty, ask:
   > Please paste the URL you want to unfurl.

2. **Follow all HTTP redirects via gluetun**

   Use wget with server-response output to trace the full redirect chain:

   ```bash
   docker exec gluetun wget -SO /dev/null --max-redirect=20 "$URL" 2>&1 | grep -E "HTTP|Location"
   ```

   This prints each hop's status code and `Location:` header, giving the full chain.

3. **Handle JavaScript-redirect pages (HubSpot, some email trackers)**

   If the first request returns `200 OK` instead of a `3xx` redirect, the page likely
   uses JavaScript to redirect. These pages usually embed a `<noscript>` fallback.

   Fetch the page body and extract the no-JS fallback `href`:

   ```bash
   docker exec gluetun wget -qO - "$URL" 2>/dev/null | grep -oE 'href="[^"]*_jss=0[^"]*"' | head -1
   ```

   If found, follow that URL through step 2 instead.

   For HubSpot specifically, the fallback is at:
   `/events/public/v1/encoded/track/tc/...?_jss=0`

4. **Handle DNS blocks**

   If the domain fails to resolve (`Name does not resolve`), AdGuard DNS inside
   gluetun is blocking it. To bypass:

   a. Temporarily disable blocking in `~/Workspace/containers/gluetun/compose.yml`:
      set `BLOCK_MALICIOUS: "off"` and `BLOCK_ADS: "off"`

   b. Recreate the container:
      ```bash
      docker compose -f ~/Workspace/containers/gluetun/compose.yml up -d --force-recreate
      ```

   c. Retry. Restore original settings and recreate again when done.

5. **Identify the final URL**

   The last `Location:` header in the chain is the final destination. If the last
   response is `200 OK` with no further `Location:`, that URL is the answer.

6. **Strip tracking parameters**

   Remove well-known tracking query parameters from the final URL:
   - `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
   - `fbclid`, `gclid`, `msclkid`, `mc_eid`, `mc_cid`, `_hsenc`, `_hsmi`
   - `ref`, `referrer`, `feature` (if clearly tracking-only, e.g. `feature=youtu.be`)

   Preserve all query parameters that affect page content (e.g. `v=` on YouTube).

7. **Report results**

   Show:
   - The full redirect chain (each hop's URL and status code)
   - The final clean URL (tracking params stripped)
   - Any tracking parameters that were removed
</process>

<success_criteria>
- Full redirect chain shown with status codes at each hop
- Final destination URL identified correctly
- Common tracking parameters stripped from the result
- Clean URL ready to copy/share
</success_criteria>
