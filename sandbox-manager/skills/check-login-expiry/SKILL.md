---
name: check-login-expiry
description: Checks whether this Claude Code session's login is about to expire, by reading the same field the CLI's own "Your login expires in N day(s) · run /login to renew" banner uses, and reports over Telegram if so. Fires on a daily cronjobs-plugin job — not on a channel command.
user-invocable: false
allowed-tools:
  - Bash
  - mcp__plugin_telegram_telegram__reply
---

<essential_principles>
The CLI shows its login-expiry banner from `claudeAiOauth.refreshTokenExpiresAt` in `~/.claude/.credentials.json`, warning once that's within 3 days of now, with `daysLeft = ceil(remaining_ms / 86400000)`. This skill reads the exact same field with the exact same formula instead of scraping the tmux pane for the banner text — more reliable, and it needs no state file: once `/login` runs, `refreshTokenExpiresAt` jumps back out past the 3-day window and the check goes quiet on its own.

Only one account/credentials file is in scope — confirmed with Cameri (2026-08-13) that claude-ricardo and claude-gina share the same underlying account, so checking this instance's credentials file is sufficient; no need to also read `containers/claude-gina/home/.claude/.credentials.json` (path moved under a consolidated `home/` mount 2026-08-20).

This is not a channel-triggered skill like its siblings in this plugin — it fires when a daily cron job (added via the `cronjobs` plugin) invokes it. Stay silent on Telegram when there's nothing to report, matching this workspace's convention for periodic checks (e.g. the daily Claude Code version-update job) — don't send a "still fine" message every day, only send when `warn` is true.
</essential_principles>

<objective>
Gives Cameri advance daily reminders over Telegram while this Claude Code session's login is within its 3-day pre-expiry window, so he can run `/login` before it lapses.
</objective>

<quick_start>
Run the bundled script — it prints a JSON verdict, it does not send anything itself:

```bash
bash scripts/check-login-expiry.sh
```
</quick_start>

<workflow>
1. Run `scripts/check-login-expiry.sh` (no arguments — it defaults to `~/.claude/.credentials.json`).
2. Parse the JSON it prints:
   - `{"warn": true, "daysLeft": N, ...}` — reply on Telegram to chat `7175022` with something like: "Heads up — your Claude Code login expires in N day(s). Run /login to renew." Keep it short, this is a daily nag until resolved.
   - `{"warn": false, ...}` — do nothing. No Telegram message, no other action.
3. If the script exits non-zero (credentials file missing/unreadable), report that failure to Telegram chat `7175022` instead of silently ignoring it — an unreadable credentials file is itself worth flagging.
</workflow>

<success_criteria>
Script exits 0 and prints a JSON object with a `warn` boolean. A Telegram message goes out if and only if `warn` is `true` (or the script failed outright); the daily check stays silent otherwise.
</success_criteria>
