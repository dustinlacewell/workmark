import { test } from "node:test";
import assert from "node:assert/strict";
import { tailBuffer } from "../dist/lib/tail-buffer.js";

test("tailBuffer keeps everything under the limit", () => {
  const tail = tailBuffer(10);
  tail.push("abc");
  tail.push("def");
  assert.equal(tail.text(), "abcdef");
});

test("tailBuffer keeps only the last `limit` characters", () => {
  const tail = tailBuffer(5);
  tail.push("abc");
  tail.push("defg");
  assert.equal(tail.text(), "cdefg");
  tail.push("0123456789");
  assert.equal(tail.text(), "56789");
});
