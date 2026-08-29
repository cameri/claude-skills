---
name: setup-hooks
description: Installs a curated set of Claude Code hooks (a destructive `rm` guard, a channel-reply enforcement Stop hook, usage-threshold Telegram alerts, an idle-state tracker, a session handoff-doc reader, a new-session Telegram notifier, a statusline usage-cache wrapper, a Lightning pay_invoice authorization gate, a plugin-version-bump reminder, a guard against unrecognized `claude` CLI subcommands, and a missing-SSH-pubkey auto-fixer) into this sandbox's own `~/.claude/settings.json`, and can turn any one of them off or back on via a `--disable`/`--enable` sentinel without touching settings.json. Use when the user asks to set up hooks, adopt hooks into sandbox-manager, install the usage-alert/telegram-reply-check/destructive-var-guard hooks, replicate this session's hook configuration elsewhere, or disable/re-enable a specific hook.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - AskUserQuestion
---

<essential_principles>
Every bundled hook script in `hooks/` is portable and contains no secrets, chat IDs, or hardcoded paths of its own — personal values (a Telegram chat ID, a bot-token `.env` path, a timezone, a handoff-doc path) are read at runtime from `~/.claude/channels/sandbox-manager/hooks-config.json`, written by this skill's install script, never baked into the plugin's tracked files. Do not hand-edit a hook script to insert a chat ID or path — always go through `scripts/install-hooks.py` so the value lands in the config file instead.

This skill only ever *adds* hook registrations — it never removes or rewrites a hook the user already has that isn't one of these eleven, and it skips re-adding a hook whose command is already present in `settings.json` (idempotent). If `statusLine` is already set to something else, it warns and leaves it alone unless told to force-overwrite.

**Explicitly disabling a hook (so a future run never reinstates it):** every bundled hook script (except `statusline-wrapper`, which isn't invoked through this event-hook protocol) checks for a sibling `<name>.py.disabled` sentinel file next to its installed copy and no-ops (prints `{}`, does nothing else) if it exists. `scripts/install-hooks.py --disable <name>` writes that sentinel; `--enable <name>` removes it. Both are standalone actions — pass one alone, not alongside `--hook`. Because a normal `--hook <name>` run only *copies* the script (it never touches the sentinel), someone can explicitly disable a hook and it stays disabled even if a later setup-hooks run re-selects it — check for an existing `<name>.py.disabled` in `--hooks-dir` before assuming a hook someone disabled is actually off.

Installing `usage-alert`, `session-start-notify`, or `telegram-reply-check` requires a working Telegram bot already configured for some channel plugin on this box (these hooks call the Telegram Bot API directly, or check for a specific channel plugin's reply-tool usage — they do not set up Telegram from scratch). If none exists, tell the user those three need a Telegram channel plugin installed and paired first, and offer to install just the Telegram-independent hooks (`destructive-var-guard`, `idle-state-tracker`, `whats-next-check`, `statusline-wrapper`, `ssh-pubkey-check`).
</essential_principles>

<objective>
Installs a curated, opt-out set of Claude Code hooks into this sandbox's own `~/.claude/settings.json` via `scripts/install-hooks.py`, and can toggle any one of them off or back on via a `--disable`/`--enable` sentinel without touching `settings.json` itself. Use for first-time hook setup, replicating this session's hook configuration elsewhere, or disabling/re-enabling a specific hook.
</objective>

<quick_start>
Ask which hooks to install (default: `destructive-var-guard`, `telegram-reply-check`, `usage-alert`, `idle-state-tracker`, `whats-next-check`, `session-start-notify`, `statusline-wrapper`, `claude-subcommand-guard`, `ssh-pubkey-check`), gather any needed Telegram config, then run `python3 scripts/install-hooks.py --hook <name> ... [--telegram-chat-id ... --telegram-env-path ... --telegram-channel-plugin ... --timezone ...]` once with every selected hook — see `<workflow>` step 6 for the full command.
</quick_start>

<hook_catalog>
| Hook | Event | Needs Telegram config? | What it does |
|---|---|---|---|
| `destructive-var-guard` | PreToolUse (Bash) | No | Blocks `rm -rf` commands whose path is an unguarded shell variable immediately followed by `/` or `*` (the classic unset-variable wipeout). |
| `telegram-reply-check` | Stop | No (has a built-in default channel-plugin name, confirm it matches) | Blocks ending a turn that started with an inbound message from the configured channel plugin until that plugin's `reply` tool has been called. |
| `usage-alert` | Stop | Yes: chat ID + bot env path | Sends a Telegram message when context-window or subscription rate-limit usage crosses a new threshold band. Depends on `statusline-wrapper` also being installed (reads the cache it writes). |
| `idle-state-tracker` | Stop | No | Writes a small `last_activity` state file after every turn, for an out-of-process bot to build idle-detection prompts on top of. |
| `whats-next-check` | SessionStart | No | If a handoff doc exists (default `$CLAUDE_PROJECT_DIR/whats-next.md`), tells Claude to read and resume it. |
| `session-start-notify` | SessionStart | Yes: chat ID + bot env path | Sends a Telegram message when a genuinely new session starts (skips resume/compact). |
| `statusline-wrapper` | statusLine (not a hook event) | No | Wraps `ccstatusline` (via `npx`), caching context/rate-limit numbers to disk on every render for `usage-alert` to read. |
| `pay-invoice-guard` | PreToolUse (the `lightning` plugin's `pay_invoice` tool) | No (needs an authorized chat ID, not a bot token) | Blocks any Lightning payment unless the transcript's most recent inbound message came from the configured authorized Telegram chat — a mechanical backstop for CLAUDE.md's Lightning Payment Policy. Only install where the `lightning` plugin is actually enabled. |
| `plugin-version-check` | Stop | No | Blocks ending a turn that changed files inside a plugin directory (has `.claude-plugin/plugin.json`) without bumping that plugin's version — a mechanical backstop for CLAUDE.md's Plugin Versioning policy. Also blocks if a plugin's `skills/` directory gained, lost, or renamed a skill without README.md/marketplace.json changing alongside it — a backstop for CLAUDE.md's skill-drift note. Exempts brand-new, never-committed plugin directories. |
| `claude-subcommand-guard` | PreToolUse (Bash) | No | Blocks running `claude <word> ...` when `<word>` looks like a subcommand but isn't a real one (verified against `claude --help`'s Commands section) — the CLI doesn't error on an unrecognized subcommand, it silently launches a full second agentic session with everything after `claude` as the prompt. Built after `claude marketplace remove ...` (real command: `claude plugin marketplace remove ...`) did exactly that and killed a live Telegram MCP connection on 2026-08-22. |
| `ssh-pubkey-check` | SessionStart | No | If `~/.ssh/id_ed25519.pub` is missing but the private key survived (a recurring container-restart artifact, confirmed 2026-08-13/16/24), regenerates the public key deterministically via `ssh-keygen -y` so the session's first signed git commit doesn't fail with "Couldn't load public key". |
</hook_catalog>

<workflow>
1. If the request is specifically to turn one hook off or back on (not a general "set up hooks" request), skip straight to step 8 — don't run the full AskUserQuestion selection flow for that.

2. Before offering the default selection, check `--hooks-dir` (default `~/.claude/hooks/`) for any `<name>.py.disabled` sentinel — a hook in that state was explicitly turned off before and shouldn't silently come back just because it's in the default set. Drop it from the offered defaults (still let the user pick it explicitly if they want it back on, which should go through step 8's `--enable`, not a plain `--hook` re-install).

3. Ask the user which hooks they want (default: the original seven plus `claude-subcommand-guard` and `ssh-pubkey-check` — `destructive-var-guard`, `telegram-reply-check`, `usage-alert`, `idle-state-tracker`, `whats-next-check`, `session-start-notify`, `statusline-wrapper`, `claude-subcommand-guard`, `ssh-pubkey-check`) — use AskUserQuestion with the catalog above summarized, multiSelect enabled. `pay-invoice-guard` and `plugin-version-check` are opt-in extras, not part of the default set — only offer `pay-invoice-guard` where the `lightning` plugin is actually installed, and only offer `plugin-version-check` where this sandbox actually has write access to a plugins repo.

4. If any selected hook needs Telegram config (`usage-alert`, `session-start-notify`, or the user wants `telegram-reply-check` tuned to a non-default plugin), gather it:
   - Detect the channel plugin name: check `enabledPlugins` in `~/.claude/settings.json` for a plugin whose name suggests a Telegram/messaging channel, and confirm with the user rather than assuming.
   - Detect a candidate bot env path: look for `.env` files under `~/.claude/channels/*/` containing a `TELEGRAM_BOT_TOKEN=` line (`grep -l TELEGRAM_BOT_TOKEN ~/.claude/channels/*/.env`) and propose the match as the default for `--telegram-env-path`. Don't read or print the token value itself.
   - Ask the user directly for the chat ID (do not guess or invent one) unless you already know it from earlier in this conversation — a wrong chat ID silently sends notifications nowhere useful, so confirm rather than assume even if one was mentioned in passing.
   - Ask for a timezone only if installing `usage-alert` and the user cares about localized reset times (optional — defaults to UTC).

5. If `whats-next-check` is selected and the user has an opinion on a non-default handoff path, capture `--handoff-doc-path`. Otherwise the default (`$CLAUDE_PROJECT_DIR/whats-next.md`) needs no input.

5a. If `pay-invoice-guard` is selected, ask the user directly for the authorized chat ID (`--pay-invoice-authorized-chat-id`) — same "don't guess" rule as the Telegram chat ID above, since this one gates real payments. If `plugin-version-check` is selected and the plugins repo isn't at the default `/workspace/projects/skills`, capture `--plugins-repo-path`.

6. Run the installer once with every selected hook and the gathered config, from this skill's own directory:

   ```bash
   python3 scripts/install-hooks.py \
     --hook destructive-var-guard --hook telegram-reply-check --hook usage-alert \
     --hook idle-state-tracker --hook whats-next-check --hook session-start-notify \
     --hook statusline-wrapper \
     --telegram-chat-id <chat-id> \
     --telegram-env-path <path-to-.env> \
     --telegram-channel-plugin <plugin-name> \
     --timezone <iana-tz>
   ```

   Omit any `--hook` flags for hooks not selected, and omit any `--telegram-*`/`--timezone`/`--handoff-doc-path`/`--pay-invoice-authorized-chat-id`/`--plugins-repo-path` flag that isn't needed by the selection. Consider running once first with `--dry-run` to preview the diff if the user seems unsure, then re-run for real.

7. Report what was installed (script paths written, hook events registered) and what was left untouched because it already existed. If `usage-alert` or `session-start-notify` was installed, remind the user the Telegram bot token itself was never touched by this skill — it stays wherever their existing channel plugin already stores it. A hook change written to `~/.claude/settings.json` only takes effect for *this* running session after a restart (`/clear` or a full process restart, depending on the hook type — `SessionStart` hooks need a fresh session, `Stop`/`PreToolUse` hooks apply from the next matching event onward without restarting). Tell the user which applies for what they just installed, rather than assuming it's live immediately.

8. For an explicit "turn X off" / "turn X back on" request: run `python3 scripts/install-hooks.py --hooks-dir <dir> --disable <name>` or `--enable <name>` (one action per invocation, not combined with `--hook`). This doesn't touch `settings.json` at all — the hook stays registered there, but its script now checks for the sentinel and no-ops. Report the sentinel path written or removed, and the same restart-timing caveat as step 7 (a `Stop`/`PreToolUse` hook's disable takes effect from the next matching event, a `SessionStart` hook's disable needs a fresh session).
</workflow>

> **OMP note (v0.18.3+):** these Claude Code hooks never run under OMP — OMP doesn't execute `~/.claude/settings.json` hooks. The `session-start-notify` notification now ships as an auto-loaded OMP extension instead (`extensions/session-start-notify.ts` at the plugin root, declared in `package.json`'s `pi` manifest): it posts on `session_start` / `session_switch` (`new`/`resume`/`fork`) for the main interactive session only, reading the same `hooks-config.json` values (`telegram_chat_id`, `telegram_env_path`) this skill's installer writes. If a user reports the session-start notification missing under OMP, point them at the extension, not at installing this hook.

<success_criteria>
`scripts/install-hooks.py` exits 0. Its "Installed scripts" and "Registered" lines list every hook the user selected exactly once; anything reported under "Already present, left untouched" was correctly not duplicated. `~/.claude/channels/sandbox-manager/hooks-config.json` contains only the non-secret values the user provided (chat ID, paths, timezone, plugin name) — never a bot token, which stays in the channel plugin's own `.env`. No hook script under `hooks/` in this skill directory or copied into `~/.claude/hooks/` contains a literal chat ID, token, or hardcoded personal path. For `--disable`/`--enable`: the command prints the sentinel path it wrote or removed, and a disabled hook's script prints `{}` and does nothing else regardless of stdin, even though `settings.json` still lists it as registered.
</success_criteria>
