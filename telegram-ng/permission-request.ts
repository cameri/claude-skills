// Pure formatting helpers for permission_request notifications, split out of
// server.ts so the truncation/pretty-print logic is unit-testable.

// input_preview is usually a compact JSON string of the tool's input (e.g.
// {"command": "..."} for Bash) — pretty-print it when it parses, otherwise
// show it verbatim.
export function formatPermissionInput(input_preview: string): string {
  try {
    return JSON.stringify(JSON.parse(input_preview), null, 2)
  } catch {
    return input_preview
  }
}

// Stay well under Telegram's 4096-char plain-text cap, leaving headroom for
// the fixed header/label text around the truncated body.
export const PERMISSION_MESSAGE_MAX_CHARS = 3500

export function truncateForTelegram(
  text: string,
  maxChars: number,
  suffix: string,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false }
  return { text: text.slice(0, maxChars) + suffix, truncated: true }
}
