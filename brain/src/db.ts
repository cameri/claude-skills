import { Database } from "@hajewski/latticedb";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export function resolveBrainPath(): string {
  const root = process.env.CLAUDE_PROJECT_DIR;
  if (!root) {
    throw new Error(
      "CLAUDE_PROJECT_DIR is not set — brain cannot resolve the workspace root to find brain/knowledge.lattice."
    );
  }
  return join(root, "brain", "knowledge.lattice");
}

export interface OpenBrainOptions {
  readOnly?: boolean;
}

export async function openBrain(
  path: string = resolveBrainPath(),
  options: OpenBrainOptions = {}
): Promise<Database> {
  if (options.readOnly) {
    const db = new Database(path, { readOnly: true });
    await db.open();
    return db;
  }
  await mkdir(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  await db.open();
  return db;
}
