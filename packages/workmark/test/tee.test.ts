import { test } from "node:test";
import assert from "node:assert/strict";
import { execTee, prefixedSink } from "../dist/lib/tee.js";
import { execAsync } from "../dist/lib/helpers.js";
import { cwd, emit, recorder, textOf } from "./support.ts";

test("execTee streams output while the child runs and returns the full text", async () => {
  const sink = recorder();
  const result = await execTee(emit("out:first", "sleep:800", "out:second"), { cwd }, sink);
  const exitedAt = Date.now();

  const first = sink.chunks.find((c) => c.text.includes("first"));
  assert.ok(first, "first chunk reached the sink");
  assert.ok(!first.text.includes("second"), "first chunk arrived on its own");
  assert.ok(exitedAt - first.at >= 500, `first chunk arrived ${exitedAt - first.at} ms before exit`);

  assert.equal(result.isError, undefined);
  assert.equal(textOf(result), "first\nsecond\n");
});

test("execTee streams stderr, then one failure summary line", async () => {
  const command = emit("err:oops", "exit:2");
  const sink = recorder();
  const result = await execTee(command, { cwd }, sink);
  assert.equal(sink.text("err"), `oops\nCommand failed (exit 2): ${command}\n`);
  assert.equal(result.isError, true);
  assert.equal(textOf(result), "oops\n");
});

test("execTee success writes no summary", async () => {
  const sink = recorder();
  await execTee(emit("out:fine"), { cwd }, sink);
  assert.equal(sink.text("err"), "");
});

for (const steps of [["out:ok"], ["exit:3"], ["err:oops", "exit:2"], ["out:partial", "exit:1"], ["out:a", "err:b", "exit:1"]]) {
  test(`execTee result text matches execAsync byte for byte: ${steps.join(" ")}`, async () => {
    const command = emit(...steps);
    const teed = await execTee(command, { cwd }, recorder());
    const captured = await execAsync(command, { cwd });
    assert.deepEqual(teed, captured);
  });
}

test("execTee timeout ends the call promptly and kills the child tree", async () => {
  const command = emit("sleep:3000", "out:late");
  const sink = recorder();
  const started = Date.now();
  const result = await execTee(command, { cwd, timeout: 300 }, sink);
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 1000, `resolved after ${elapsed} ms`);
  assert.equal(result.isError, true);
  assert.equal(textOf(result), `Command failed: ${command}\n`);
  assert.equal(sink.text("err"), `Command failed (timeout 300 ms): ${command}\n`);
});

test("prefixedSink labels concurrent output line by line", async () => {
  const sink = recorder();
  await Promise.all([
    execTee(emit("out:one", "raw:par", "sleep:300", "raw:tial", "out:", "out:two"), { cwd }, prefixedSink(sink, "[a] ")),
    execTee(emit("out:one", "sleep:150", "out:two", "raw:tail"), { cwd }, prefixedSink(sink, "[b] ")),
  ]);
  const lines = sink.text("out").split("\n").filter(Boolean).sort();
  assert.deepEqual(lines, ["[a] one", "[a] partial", "[a] two", "[b] one", "[b] tail", "[b] two"]);
});
