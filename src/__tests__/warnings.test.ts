import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pendingWarnings } from "../utils/warnings";

describe("pendingWarnings", () => {
  it("is an array", () => {
    assert.ok(Array.isArray(pendingWarnings));
  });

  it("can accumulate warnings and be drained", () => {
    const initial = pendingWarnings.length;
    pendingWarnings.push("test warning 1");
    pendingWarnings.push("test warning 2");
    assert.equal(pendingWarnings.length, initial + 2);

    const drained = pendingWarnings.splice(0);
    assert.ok(drained.length >= 2);
    assert.ok(drained.includes("test warning 1"));
    assert.ok(drained.includes("test warning 2"));
    assert.equal(pendingWarnings.length, 0);
  });
});
