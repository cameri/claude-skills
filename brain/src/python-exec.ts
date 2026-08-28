export interface PythonExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type PythonExec = (pythonPath: string, args: string[]) => Promise<PythonExecResult>;

export const spawnPython: PythonExec = async (pythonPath, args) => {
  const proc = Bun.spawn([pythonPath, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
};
