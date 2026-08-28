export interface PythonExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type PythonExec = (pythonPath: string, args: string[], cwd?: string) => Promise<PythonExecResult>;

// cwd restores the working directory graphify's own CLI runs from (the corpus
// root), so any relative path inside graphify's code resolves the way it does
// under a real `graphify` invocation. Callers still pass every path they care
// about explicitly — this is defence in depth, not the primary mechanism.
export const spawnPython: PythonExec = async (pythonPath, args, cwd) => {
  const proc = Bun.spawn([pythonPath, ...args], { stdout: "pipe", stderr: "pipe", ...(cwd ? { cwd } : {}) });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
};
