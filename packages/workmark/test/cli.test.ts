import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { CLI, EMIT } from "./support.ts";

// End-to-end: run the built `wm` CLI against a throwaway workspace.

const execFileAsync = promisify(execFile);
let root = "";

/** Shared top of every fixture command: `emit(steps)` builds a command
 * that runs the emit.mjs test child. */
const PRELUDE = `const emit = (steps) => 'node "' + process.env.WM_TEST_EMIT + '" ' + steps;\n`;

/** Fixture commands: name → `export default` body. */
const COMMANDS: Record<string, string> = {
  echo: `{ handler: (_, c) => c.sh(emit("out:hello")) }`,
  data: `{ handler: (_, c) => c.ok({ answer: 42 }) }`,
  broken: `{ handler: (_, c) => c.sh(emit("err:bad exit:2")) }`,
  silent: `{ handler: (_, c) => c.sh(emit("exit:5")) }`,
  rawtext: `{ handler: async (_, c) => c.ok((await c.sh(emit("out:hi"))).content[0].text) }`,
  invwrap: `{ handler: async (_, c) => c.ok("got: " + (await c.sh(emit("out:hello"))).content[0].text) }`,
  contains: `{ handler: async (_, c) => { await c.sh(emit("out:hello")); return c.ok("say hello\\nagain"); } }`,
  twice: `{ handler: async (_, c) => { await c.sh(emit("out:hello")); return c.ok("ran 2x hello\\n"); } }`,
  extra: `{ handler: async (_, c) => {
    const r = await c.sh(emit("out:hi"));
    r.content.push({ type: "text", text: "EXTRA" });
    return r;
  } }`,
  tmo: `{ handler: async (_, c) => {
    const r = await c.sh(emit("out:early sleep:3000"), { timeout: 500 });
    return c.ok('text="' + r.content[0].text.trim() + '"');
  } }`,
  crlf: `{ handler: async (_, c) => c.ok((await c.sh("echo hi")).content[0].text.replace(/\\r\\n/g, "\\n")) }`,
  single: `{ needs: ["stub"], handler: (_, c) => c.sh(emit("out:one")) }`,
  each: `{ needs: ["stub"], select: "all", run: { concurrency: 2 },
    handler: (_, c) => c.sh(emit("out:one sleep:300 out:two")) }`,
  serial: `{ needs: ["stub"], select: "all", run: { order: "serial" },
    handler: (_, c) => c.sh(emit("out:one out:two")) }`,
  serialdata: `{ needs: ["stub"], select: "all", run: { order: "serial" },
    handler: (_, c) => c.ok("data " + c.project.name) }`,
  dataall: `{ needs: ["stub"], select: "all", run: { concurrency: 2 },
    handler: (_, c) => c.ok("1.2.3") }`,
  mixed: `{ needs: ["stub"], select: "all", run: { concurrency: 2 },
    handler: (_, c) => c.project.name === "beta" ? c.ok("skipped") : c.sh(emit("out:hi")) }`,
  reducenl: `{ needs: ["stub"], select: "all",
    run: { reduce: (rs) => ({ content: [{ type: "text", text: rs.map((r) => r.project + ": " + r.output).join("\\n") }] }) },
    handler: (_, c) => c.sh(emit("out:g")) }`,
};

function write(rel: string, source: string): void {
  const full = join(root, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, source);
}

before(() => {
  root = mkdtempSync(join(tmpdir(), "wm-cli-test-"));
  const zod = import.meta.resolve("zod");
  const define = new URL("../dist/lib/define.js", import.meta.url).href;
  write(".wm/traits/stub.ts", [
    `import { z } from ${JSON.stringify(zod)};`,
    `import { defineTrait } from ${JSON.stringify(define)};`,
    `export const stub = defineTrait({ name: "stub", schema: z.object({}) });`,
  ].join("\n"));
  write("wm.ts", `export default [
  { name: "alpha", dir: "alpha", has: { stub: {} } },
  { name: "beta", dir: "beta", has: { stub: {} } },
];`);
  mkdirSync(join(root, "alpha"));
  mkdirSync(join(root, "beta"));
  for (const [name, body] of Object.entries(COMMANDS)) {
    write(`.wm/commands/${name}.ts`, `${PRELUDE}export default ${body};\n`);
  }
});

after(() => {
  rmSync(root, { recursive: true, force: true });
});

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

async function wm(...args: string[]): Promise<Run> {
  const env = { ...process.env, WORKSPACE_ROOT: root, WM_TEST_EMIT: EMIT };
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [CLI, ...args], { cwd: root, env });
    return { code: 0, stdout, stderr };
  } catch (e) {
    const err = e as { code: number; stdout: string; stderr: string };
    return { code: err.code, stdout: err.stdout, stderr: err.stderr };
  }
}

// --- single project / no project -------------------------------------------

test("raw sh result: streamed once, not printed again", async () => {
  const run = await wm("echo");
  assert.equal(run.code, 0);
  assert.equal(run.stdout, "hello\n");
});

test("ok(sh text): printed once", async () => {
  assert.equal((await wm("rawtext")).stdout, "hi\n");
});

test("ok(data) prints in full", async () => {
  const run = await wm("data");
  assert.equal(run.code, 0);
  assert.equal(run.stdout, `{\n  "answer": 42\n}\n`);
});

test("invwrap: a result wrapping sh text prints in full", async () => {
  assert.equal((await wm("invwrap")).stdout, "hello\ngot: hello\n\n");
});

test("contains: a result containing the streamed text prints in full", async () => {
  assert.equal((await wm("contains")).stdout, "hello\nsay hello\nagain\n");
});

test("twice: a result ending in the streamed text prints in full", async () => {
  assert.equal((await wm("twice")).stdout, "hello\nran 2x hello\n\n");
});

test("content pushed onto a streamed result: the full result prints", async () => {
  assert.equal((await wm("extra")).stdout, "hi\nhi\n\nEXTRA\n");
});

test("tmo: a timed-out call's text survives in the printed result", async () => {
  const run = await wm("tmo");
  assert.equal(run.code, 0);
  assert.equal(run.stdout, `early\ntext="early"\n`);
  assert.match(run.stderr, /^Command failed \(timeout 500 ms\): /);
});

test("crlf: CRLF stream vs LF result counts as already shown", async () => {
  const run = await wm("crlf");
  assert.equal(run.stdout.replace(/\r\n/g, "\n"), "hi\n");
});

test("a streamed failure prints stderr once, then one summary line, and exits 1", async () => {
  const run = await wm("broken");
  assert.equal(run.code, 1);
  const lines = run.stderr.split("\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[0], "bad");
  assert.match(lines[1], /^Command failed \(exit 2\): node ".*emit\.mjs" err:bad exit:2$/);
  assert.equal(lines[2], "");
  assert.equal(run.stdout, "");
});

test("a silent streamed failure prints the summary line once", async () => {
  const run = await wm("silent");
  assert.equal(run.code, 1);
  assert.match(run.stderr, /^Command failed \(exit 5\): [^\n]*\n$/);
  assert.equal(run.stdout, "");
});

test("a single-project run prints no header", async () => {
  const run = await wm("single", "alpha");
  assert.equal(run.code, 0);
  assert.equal(run.stdout, "one\n");
});

// --- multi-project ---------------------------------------------------------

test("concurrent sh-only run: prefixed lines, aggregate not printed", async () => {
  const run = await wm("each");
  assert.equal(run.code, 0);
  const lines = run.stdout.split("\n").filter(Boolean).sort();
  assert.deepEqual(lines, ["[alpha] one", "[alpha] two", "[beta] one", "[beta] two"]);
});

test("serial sh-only run: a live header before each project, aggregate not printed", async () => {
  const run = await wm("serial");
  assert.equal(run.code, 0);
  assert.equal(run.stdout, "--- alpha ---\none\ntwo\n--- beta ---\none\ntwo\n");
});

test("serial run of non-sh handlers prints the old aggregate", async () => {
  const run = await wm("serialdata");
  assert.equal(run.stdout, "--- alpha ---\ndata alpha\n\n--- beta ---\ndata beta\n");
});

test("dataall: concurrent non-sh run prints the old aggregate with headers", async () => {
  const run = await wm("dataall");
  assert.equal(run.stdout, "--- alpha ---\n1.2.3\n\n--- beta ---\n1.2.3\n");
});

test("mixed: one project did not stream, so the full aggregate prints", async () => {
  const run = await wm("mixed");
  assert.equal(run.code, 0);
  assert.ok(run.stdout.startsWith("[alpha] hi\n"));
  assert.ok(run.stdout.endsWith("--- alpha ---\nhi\n\n\n--- beta ---\nskipped\n"));
  assert.equal(run.stdout.split("\n").filter((l) => l === "skipped").length, 1);
});

test("reducenl: a reducer's result prints in full", async () => {
  const run = await wm("reducenl");
  assert.equal(run.code, 0);
  assert.ok(run.stdout.endsWith("alpha: g\n\nbeta: g\n\n"), JSON.stringify(run.stdout));
});
