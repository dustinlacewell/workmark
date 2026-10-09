import { test } from "node:test";
import assert from "node:assert/strict";
import { flushPrefixed, prefixLines } from "../dist/lib/line-prefix.js";

test("prefixLines labels each complete line", () => {
  assert.deepEqual(prefixLines("[a] ", "", "one\ntwo\n"), { text: "[a] one\n[a] two\n", pending: "" });
});

test("prefixLines holds a partial line until its newline arrives", () => {
  const first = prefixLines("[a] ", "", "one\npar");
  assert.deepEqual(first, { text: "[a] one\n", pending: "par" });
  const second = prefixLines("[a] ", first.pending, "tial\n");
  assert.deepEqual(second, { text: "[a] partial\n", pending: "" });
});

test("prefixLines emits nothing for a chunk with no newline", () => {
  assert.deepEqual(prefixLines("[a] ", "x", "y"), { text: "", pending: "xy" });
});

test("prefixLines keeps CRLF line endings intact", () => {
  assert.deepEqual(prefixLines("[a] ", "", "one\r\n"), { text: "[a] one\r\n", pending: "" });
});

test("flushPrefixed ends a held partial line, and is empty when nothing is held", () => {
  assert.equal(flushPrefixed("[a] ", "tail"), "[a] tail\n");
  assert.equal(flushPrefixed("[a] ", ""), "");
});
