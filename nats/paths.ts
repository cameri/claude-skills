import { join, resolve } from "node:path";

/**
 * Base claude-config directory for this process.
 * Honors CLAUDE_CONFIG_DIR (omp config-home isolation for flock members); when
 * unset, defaults to ~/.claude so the primary and existing hosts are unchanged.
 * When the override is set it is used exclusively - never merged with ~/.claude.
 */
export function resolveClaudeBaseDir(
  env: Record<string, string | undefined> = process.env,
  home: string = process.env.HOME ?? "",
): string {
  const override = env.CLAUDE_CONFIG_DIR?.trim();
  return override ? resolve(override) : join(home, ".claude");
}
