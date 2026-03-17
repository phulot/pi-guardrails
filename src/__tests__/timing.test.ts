import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createExecutionTimer,
  markExecutionEnd,
  markExecutionStart,
  type TimedExecution,
} from "../lib/timing";

describe("markExecutionStart", () => {
  it("sets startedAt to current time by default", () => {
    const target: TimedExecution = {};
    const before = Date.now();
    markExecutionStart(target);
    const after = Date.now();
    assert.ok((target.startedAt ?? 0) >= before);
    assert.ok((target.startedAt ?? 0) <= after);
  });

  it("accepts a custom startedAt", () => {
    const target: TimedExecution = {};
    markExecutionStart(target, 1000);
    assert.equal(target.startedAt, 1000);
  });

  it("returns the same target", () => {
    const target: TimedExecution = {};
    const result = markExecutionStart(target);
    assert.equal(result, target);
  });
});

describe("markExecutionEnd", () => {
  it("sets endedAt and computes durationMs", () => {
    const target: TimedExecution = { startedAt: 1000 };
    markExecutionEnd(target, 1500);
    assert.equal(target.endedAt, 1500);
    assert.equal(target.durationMs, 500);
  });

  it("does not set durationMs without startedAt", () => {
    const target: TimedExecution = {};
    markExecutionEnd(target, 1500);
    assert.equal(target.endedAt, 1500);
    assert.equal(target.durationMs, undefined);
  });

  it("clamps durationMs to 0 minimum", () => {
    const target: TimedExecution = { startedAt: 2000 };
    markExecutionEnd(target, 1000);
    assert.equal(target.durationMs, 0);
  });
});

describe("createExecutionTimer", () => {
  it("tracks elapsed time", () => {
    const timer = createExecutionTimer(1000);
    assert.equal(timer.startedAt, 1000);
    const duration = timer.getDurationMs(1200);
    assert.equal(duration, 200);
  });

  it("clamps to 0 minimum", () => {
    const timer = createExecutionTimer(5000);
    assert.equal(timer.getDurationMs(1000), 0);
  });
});
