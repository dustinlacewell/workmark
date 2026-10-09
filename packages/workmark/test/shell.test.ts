import { test } from "node:test";
import assert from "node:assert/strict";
import { MCP_DEFAULT_TIMEOUT, captureShell, interactiveShell, shellFor, teeShell } from "../dist/lib/shell.js";
import { Transcript } from "../dist/lib/transcript.js";
import { cwd, emit, recorder, textOf } from "./support.ts";

test("the CLI host tees with no default timeout; MCP captures with 120 s", () => {
  assert.equal(shellFor("cli", false).defaultTimeout, undefined);
  assert.equal(shellFor("mcp", false).defaultTimeout, 120_000);
  assert.equal(MCP_DEFAULT_TIMEOUT, 120_000);
  assert.equal(shellFor("cli", true), interactiveShell);
  assert.equal(shellFor("mcp", true).defaultTimeout, 120_000, "interactive off the CLI falls back to capture");
});

test("a tee shell without a default timeout lets a long command finish", async () => {
  const sink = recorder();
  const result = await teeShell(() => sink).one(emit("sleep:1200", "out:done"), { cwd });
  assert.equal(result.isError, undefined);
  assert.equal(textOf(result), "done\n");
  assert.equal(sink.text("out"), "done\n");
});

test("the same command dies under an injected short default", async () => {
  const result = await teeShell(() => recorder(), { defaultTimeout: 300 }).one(emit("sleep:1200", "out:done"), { cwd });
  assert.equal(result.isError, true);
});

test("an explicit timeout overrides the default", async () => {
  const result = await teeShell(() => recorder(), { defaultTimeout: 300 })
    .one(emit("sleep:600", "out:done"), { cwd, timeout: 5_000 });
  assert.equal(result.isError, undefined);
});

test("the MCP shell captures only: nothing reaches stdout", async () => {
  const written: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    written.push(String(chunk));
    return (original as (...a: unknown[]) => boolean)(chunk, ...rest);
  }) as typeof process.stdout.write;
  let result;
  try {
    result = await shellFor("mcp", false).one(emit("out:captured-marker"), { cwd });
  } finally {
    process.stdout.write = original;
  }
  assert.equal(textOf(result), "captured-marker\n");
  assert.ok(!written.join("").includes("captured-marker"));
});

test("a capture shell applies its default timeout", async () => {
  const result = await captureShell(300).one(emit("sleep:1200", "out:done"), { cwd });
  assert.equal(result.isError, true);
});

test("a concurrent project shell prefixes lines and tracks only its own text", async () => {
  const sink = recorder();
  const top = new Transcript();
  const scoped = teeShell(() => sink, { transcript: top }).forProject("proj", true);
  assert.equal(scoped.shown(), null, "nothing shown before any sh call");
  await scoped.shell.one(emit("out:hi"), { cwd });
  assert.equal(sink.text("out"), "[proj] hi\n");
  assert.equal(scoped.shown()?.[0], "hi\n");
  assert.equal(top.shown(), null, "the command-level transcript is untouched");
});

test("a serial project shell writes its header once, before its first command", async () => {
  const sink = recorder();
  const scoped = teeShell(() => sink).forProject("proj", false);
  assert.equal(sink.text("out"), "", "no header for a project that never runs sh");
  await scoped.shell.one(emit("out:a"), { cwd });
  await scoped.shell.one(emit("out:b"), { cwd });
  assert.equal(sink.text("out"), "--- proj ---\na\nb\n");
  assert.equal(scoped.shown()?.[0], "a\nb\n");
});

test("capture shells have no project scope and record nothing", () => {
  const capture = captureShell(1_000);
  const scoped = capture.forProject("proj", true);
  assert.equal(scoped.shell, capture);
  assert.equal(scoped.shown(), null);
  assert.doesNotThrow(() => capture.markShown("x"));
});

test("markShown records text in the command-level transcript", () => {
  const top = new Transcript();
  teeShell(() => recorder(), { transcript: top }).markShown("all of it");
  assert.equal(top.shown()?.[0], "all of it");
});

test("tee seq fails fast, runs no later command, and records the combined text once", async () => {
  const sink = recorder();
  const top = new Transcript();
  const result = await teeShell(() => sink, { transcript: top })
    .seq([emit("out:a"), emit("exit:4"), emit("out:never")], { cwd });
  assert.equal(result.isError, true);
  assert.equal(sink.text("out"), "a\n");
  assert.equal(sink.text("err"), `Command failed (exit 4): ${emit("exit:4")}\n`);
  assert.equal(textOf(result), `a\n\nCommand failed: ${emit("exit:4")}\n`);
  assert.equal(top.shown()?.[0], textOf(result));
});

test("tee seq concatenates outputs like the capture shell", async () => {
  const commands = [emit("out:a"), emit("out:b")];
  const teed = await teeShell(() => recorder()).seq(commands, { cwd });
  const captured = await captureShell(10_000).seq(commands, { cwd });
  assert.deepEqual(teed, captured);
  assert.equal(textOf(teed), "a\n\nb\n");
});
