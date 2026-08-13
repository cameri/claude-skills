#!/usr/bin/env bash
# Reports whether this Claude Code session's login is close to expiring, by
# reading the same field and applying the same formula the CLI itself uses
# for its "Your login expires in N day(s) · run /login to renew" banner
# (claudeAiOauth.refreshTokenExpiresAt in .credentials.json, warns inside a
# 3-day window). Prints a JSON result; does not send any notification itself.
set -euo pipefail

creds_file="${1:-$HOME/.claude/.credentials.json}"

if [ ! -f "$creds_file" ]; then
  echo "Credentials file not found: $creds_file" >&2
  exit 1
fi

now_ms=$(($(date +%s) * 1000))
day_ms=86400000
window_ms=$((3 * day_ms))

jq --argjson now "$now_ms" --argjson day "$day_ms" --argjson window "$window_ms" '
  .claudeAiOauth as $o
  | if ($o.refreshTokenExpiresAt | type) != "number" then
      {warn: false, reason: "no_refresh_token_expiry"}
    elif (($o.expiresAt | type) == "number") and ($o.expiresAt > ($o.refreshTokenExpiresAt + $window)) then
      {warn: false, reason: "inconsistent_expiry"}
    else
      ($o.refreshTokenExpiresAt - $now) as $remainingMs
      | if ($remainingMs <= 0) or ($remainingMs > $window) then
          {warn: false, daysLeft: null, remainingMs: $remainingMs}
        else
          {warn: true, daysLeft: (($remainingMs / $day) | ceil), remainingMs: $remainingMs}
        end
    end
' "$creds_file"
