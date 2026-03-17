import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasGlobChars } from "../utils/glob-expander";

describe("hasGlobChars", () => {
  it("detects *", () => {
    assert.ok(hasGlobChars(".env*"));
  });

  it("detects ?", () => {
    assert.ok(hasGlobChars("file?.ts"));
  });

  it("detects [", () => {
    assert.ok(hasGlobChars("[abc].ts"));
  });

  it("detects ]", () => {
    assert.ok(hasGlobChars("file[0]"));
  });

  it("returns false for plain strings", () => {
    assert.ok(!hasGlobChars(".env"));
    assert.ok(!hasGlobChars("src/file.ts"));
    assert.ok(!hasGlobChars(""));
  });
});
