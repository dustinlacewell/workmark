import { test } from "node:test";
import assert from "node:assert/strict";
import { alreadyShown } from "../dist/lib/shown.js";

test("equal text counts as already shown", () => {
  assert.equal(alreadyShown("hi\n", ["hi\n"]), true);
});

test("CRLF and trailing whitespace are ignored", () => {
  assert.equal(alreadyShown("hi\n", ["hi\r\n"]), true);
  assert.equal(alreadyShown("a\nb", ["a\r\nb\r\n  \n"]), true);
});

test("any other difference does not count", () => {
  assert.equal(alreadyShown("got: hi\n", ["hi\n"]), false);
  assert.equal(alreadyShown("say hello\nagain", ["hello\n"]), false);
  assert.equal(alreadyShown("ran 2x hello\n", ["hello\n"]), false);
  assert.equal(alreadyShown(" hi", ["hi"]), false, "leading whitespace matters");
});

test("a result equal to one call's output counts: sh(a) then return sh(b)", () => {
  const shown = ["a\nb\n", "a\n", "b\n"];
  assert.equal(alreadyShown("b\n", shown), true);
  assert.equal(alreadyShown("a\nb\n", shown), true);
  assert.equal(alreadyShown("b\nextra", shown), false);
});

test("nothing shown never matches, even an empty result", () => {
  assert.equal(alreadyShown("", null), false);
});
