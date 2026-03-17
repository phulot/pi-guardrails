import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterThinkingTags } from "../lib/executor";

describe("filterThinkingTags", () => {
  it("removes thinking tags", () => {
    const input = "<thinking>internal reasoning</thinking>Hello world";
    assert.equal(filterThinkingTags(input), "Hello world");
  });

  it("removes multiple thinking blocks", () => {
    const input = "<thinking>first</thinking>A<thinking>second</thinking>B";
    assert.equal(filterThinkingTags(input), "AB");
  });

  it("removes multiline thinking blocks", () => {
    const input = "<thinking>\nline1\nline2\n</thinking>\nResult";
    assert.equal(filterThinkingTags(input), "Result");
  });

  it("returns text unchanged when no thinking tags", () => {
    assert.equal(filterThinkingTags("Hello world"), "Hello world");
  });

  it("handles empty string", () => {
    assert.equal(filterThinkingTags(""), "");
  });
});
