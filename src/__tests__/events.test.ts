import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GUARDRAILS_BLOCKED_EVENT,
  GUARDRAILS_DANGEROUS_EVENT,
} from "../utils/events";

describe("event constants", () => {
  it("exports expected event names", () => {
    assert.equal(GUARDRAILS_BLOCKED_EVENT, "guardrails:blocked");
    assert.equal(GUARDRAILS_DANGEROUS_EVENT, "guardrails:dangerous");
  });
});
