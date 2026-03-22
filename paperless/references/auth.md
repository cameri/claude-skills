# Paperless-ngx Authentication

Source credentials from `~/.claude/channels/paperless/.env`. If the file is
missing or any required key (`PAPERLESS_URL`, `PAPERLESS_USERNAME`,
`PAPERLESS_PASSWORD`) is absent, tell the user to run `/paperless:configure`
first and stop.

Obtain an auth token:

```bash
TOKEN=$(http --ignore-stdin -b POST "${PAPERLESS_URL%/}/api/token/" \
  username="$PAPERLESS_USERNAME" \
  password="$PAPERLESS_PASSWORD" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
```

If `TOKEN` is empty, report the authentication failure and stop.

## Notes

- Always pass `--ignore-stdin` to `http` to prevent blocking.
- Use `-b` (body-only) to get clean JSON for parsing.
- Strip trailing slashes from `PAPERLESS_URL` with `${PAPERLESS_URL%/}`.
