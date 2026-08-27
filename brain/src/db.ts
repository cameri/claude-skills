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

export async function openBrain(path: string = resolveBrainPath()): Promise<Database> {
  await mkdir(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  await db.open();
  return db;
}
