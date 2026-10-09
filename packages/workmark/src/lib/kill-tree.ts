import { spawn, type ChildProcess } from "node:child_process";

// --- Timeout kill --------------------------------------------------------
//
// On Windows a shell child (`shell: true`) runs the real command as its own
// child, and killing cmd.exe alone leaves that grandchild running. On POSIX,
// kill the shell only — the same as exec's timeout — so the child stays in
// the terminal's process group and Ctrl-C reaches it.

/** Kill a timed-out shell child. Resolves once the kill has been delivered. */
export function killTree(child: ChildProcess): Promise<void> {
  if (child.pid === undefined || process.platform !== "win32") {
    child.kill("SIGTERM");
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const fallback = () => {
      child.kill("SIGTERM");
      resolve();
    };
    const killer = spawn("taskkill", ["/T", "/F", "/PID", String(child.pid)], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.on("error", fallback);
    killer.on("exit", (code) => (code === 0 ? resolve() : fallback()));
  });
}
