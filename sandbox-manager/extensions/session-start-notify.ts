/**
 * OMP extension: notify the owner over Telegram when a session starts.
 *
 * Port of the `setup-hooks` skill's `session-start-notify.py` Claude Code
 * SessionStart hook. Claude Code hooks never run under OMP — sessions live in
 * one long-lived process, and `/new` is an in-process session switch, not a
 * new process — so the notification moved here, keyed on OMP's session
 * lifecycle events:
 *
 *   session_start              — process start (the initial session)
 *   session_switch "new"       — /new
 *   session_switch "resume"    — /resume (names the resumed session)
 *   session_switch "fork"      — /fork
 *
 * Compaction is not a session boundary and fires no event here, so there is
 * nothing to skip. Only the main interactive session notifies (ctx.hasUI):
 * task subagents and headless/print runs re-bind this extension inside their
 * own sessions and would otherwise spam one message each.
 *
 * Portable: no secrets, chat IDs, or hardcoded paths of its own. The chat ID
 * and bot-token .env path are read at runtime from
 * ~/.claude/channels/sandbox-manager/hooks-config.json
 * ({"telegram_chat_id": ..., "telegram_env_path": ...}), falling back to the
 * TELEGRAM_CHAT_ID / TELEGRAM_BOT_TOKEN env vars, then the telegram channel
 * plugin's .env, then the workspace primary contact chat ID (see CLAUDE.md
 * "Telegram Communication"). Failures are swallowed — the hook must never
 * break a session start.
 */
import { closeSync, openSync, readFileSync, readSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const HOOKS_CONFIG = join(homedir(), ".claude", "channels", "sandbox-manager", "hooks-config.json");
const TELEGRAM_ENV = join(homedir(), ".claude", "channels", "telegram", ".env");
// Workspace CLAUDE.md "Telegram Communication" — primary contact chat ID.
const CHAT_FALLBACK = "7175022";

let resumeTargetSessionFile: string | undefined;

function readJsonFile(file: string): Record<string, unknown> {
	try {
		return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
	} catch {
		return {};
	}
}

function loadBotToken(): string | undefined {
	if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN;
	const config = readJsonFile(HOOKS_CONFIG);
	const envPath = typeof config.telegram_env_path === "string" ? config.telegram_env_path : TELEGRAM_ENV;
	try {
		for (const line of readFileSync(envPath, "utf8").split("\n")) {
			const match = /^TELEGRAM_BOT_TOKEN=(.+)$/.exec(line.trim());
			if (match) return match[1];
		}
	} catch {
		// fall through to undefined
	}
	return undefined;
}

function resolveChatId(): string {
	const config = readJsonFile(HOOKS_CONFIG);
	if (typeof config.telegram_chat_id === "string" && config.telegram_chat_id) {
		return config.telegram_chat_id;
	}
	return process.env.TELEGRAM_CHAT_ID || CHAT_FALLBACK;
}

async function sendTelegram(text: string): Promise<void> {
	const token = loadBotToken();
	if (!token) return;
	try {
		await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: "POST",
			body: new URLSearchParams({ chat_id: resolveChatId(), text }),
			signal: AbortSignal.timeout(8_000),
		});
	} catch {
		// Never let a notification failure surface into the session.
	}
}

/**
 * Current session title from the fixed-width first-line slot of a session
 * file (`<agentDir>/sessions/<project>/<timestamp>_<id>.jsonl`). Only the
 * first line is read — the slot is 256 bytes, and the file can be huge.
 */
function readSessionTitle(sessionFile: string): string | undefined {
	const fd = openSync(sessionFile, "r");
	try {
		const buf = Buffer.alloc(512);
		const n = readSync(fd, buf, 0, buf.length, 0);
		const firstLine = buf.toString("utf8", 0, n).split("\n", 1)[0];
		const entry = JSON.parse(firstLine) as { type?: string; title?: string };
		if (entry.type === "title" && entry.title) return entry.title;
	} catch {
		// fall through to undefined
	} finally {
		closeSync(fd);
	}
	return undefined;
}

export default function sessionStartNotify(pi: ExtensionAPI): void {
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		await sendTelegram("Session started (source: startup).");
	});

	pi.on("session_before_switch", async event => {
		if (event.reason === "resume") resumeTargetSessionFile = event.targetSessionFile;
	});

	pi.on("session_switch", async (event, ctx) => {
		if (!ctx.hasUI) return;
		switch (event.reason) {
			case "new":
				await sendTelegram("Session started (source: new).");
				break;
			case "resume":
				await sendTelegram(
					`Resumed session: ${
						resumeTargetSessionFile
							? readSessionTitle(resumeTargetSessionFile) ??
								resumeTargetSessionFile.split("/").pop() ??
								"unknown"
							: "unknown"
					}.`,
				);
				resumeTargetSessionFile = undefined;
				break;
			case "fork":
				await sendTelegram("Session started (source: fork).");
				break;
		}
	});
}
