/**
 * Idle-detection sentinel — pure functions, no side effects.
 *
 * Decides whether to nag the user after a stretch of inactivity, and what
 * the next nag action should be (offer "compact" once, then fall back to
 * "park it" via clear+rename).
 */

export function shouldPromptIdle(input: {
  lastActivityMs: number
  nowMs: number
  idleThresholdMs: number
  idleSafe: boolean
  alreadyPromptedAtMs: number | null
}): boolean {
  const { lastActivityMs, nowMs, idleThresholdMs, idleSafe, alreadyPromptedAtMs } = input

  if (!idleSafe) return false
  if (nowMs - lastActivityMs < idleThresholdMs) return false

  // Suppress if we already prompted for this same idle stretch — i.e. the
  // last prompt happened at or after the last activity. Fresh activity
  // after the last prompt (alreadyPromptedAtMs < lastActivityMs) means the
  // user came back and went idle again, so a re-prompt is allowed.
  if (alreadyPromptedAtMs !== null && alreadyPromptedAtMs >= lastActivityMs) return false

  return true
}

export function nextIdleAction(compactCount: number, compactCap: number): 'compact' | 'clear' {
  return compactCount < compactCap ? 'compact' : 'clear'
}
