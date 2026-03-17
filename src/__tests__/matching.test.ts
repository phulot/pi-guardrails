import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compileCommandPattern,
  compileCommandPatterns,
  compileFilePattern,
  compileFilePatterns,
  normalizeFilePath,
} from "../utils/matching";

describe("normalizeFilePath", () => {
  it("replaces backslashes with forward slashes", () => {
    assert.equal(normalizeFilePath("src\\utils\\file.ts"), "src/utils/file.ts");
  });

  it("removes leading ./", () => {
    assert.equal(normalizeFilePath("./src/file.ts"), "src/file.ts");
  });

  it("removes multiple leading ./", () => {
    assert.equal(normalizeFilePath("././src/file.ts"), "src/file.ts");
  });

  it("collapses duplicate slashes", () => {
    assert.equal(
      normalizeFilePath("src//utils///file.ts"),
      "src/utils/file.ts",
    );
  });

  it("handles combined normalization", () => {
    assert.equal(
      normalizeFilePath(".\\src\\\\utils//file.ts"),
      "src/utils/file.ts",
    );
  });

  it("returns plain filename unchanged", () => {
    assert.equal(normalizeFilePath(".env"), ".env");
  });
});

describe("compileFilePattern (glob)", () => {
  it("matches basename when pattern has no /", () => {
    const p = compileFilePattern({ pattern: ".env" });
    assert.ok(p.test(".env"));
    assert.ok(p.test("src/.env"));
    assert.ok(p.test("./src/.env"));
    assert.ok(!p.test(".env.example"));
  });

  it("matches glob wildcard on basename", () => {
    const p = compileFilePattern({ pattern: ".env.*" });
    assert.ok(p.test(".env.local"));
    assert.ok(p.test(".env.production"));
    assert.ok(!p.test(".env"));
  });

  it("matches full path when pattern contains /", () => {
    const p = compileFilePattern({ pattern: "src/*.ts" });
    assert.ok(p.test("src/file.ts"));
    assert.ok(!p.test("lib/file.ts"));
  });

  it("matches allowed patterns correctly", () => {
    const p = compileFilePattern({ pattern: "*.example.env" });
    assert.ok(p.test("app.example.env"));
    assert.ok(!p.test(".env"));
  });
});

describe("compileFilePattern (regex)", () => {
  it("matches regex pattern case-insensitively", () => {
    const p = compileFilePattern({ pattern: "^\\.env(\\..+)?$", regex: true });
    assert.ok(p.test(".env"));
    assert.ok(p.test(".env.local"));
    assert.ok(p.test(".ENV"));
    assert.ok(!p.test("not-env"));
  });

  it("matches regex with path", () => {
    const p = compileFilePattern({ pattern: "/.ssh/", regex: true });
    assert.ok(p.test("/home/user/.ssh/id_rsa"));
    assert.ok(!p.test("/home/user/.config/file"));
  });

  it("returns false for invalid regex", () => {
    const p = compileFilePattern({ pattern: "[invalid", regex: true });
    assert.ok(!p.test("anything"));
  });
});

describe("compileCommandPattern (substring)", () => {
  it("matches substring", () => {
    const p = compileCommandPattern({ pattern: "rm -rf" });
    assert.ok(p.test("rm -rf /tmp/dir"));
    assert.ok(p.test("sudo rm -rf /"));
    assert.ok(!p.test("rm -r /tmp"));
  });

  it("matches exact command", () => {
    const p = compileCommandPattern({ pattern: "sudo" });
    assert.ok(p.test("sudo apt update"));
    assert.ok(p.test("echo sudo"));
    assert.ok(!p.test("su root"));
  });
});

describe("compileCommandPattern (regex)", () => {
  it("matches regex pattern", () => {
    const p = compileCommandPattern({ pattern: "^sudo\\s", regex: true });
    assert.ok(p.test("sudo apt update"));
    assert.ok(!p.test("echo sudo something"));
  });

  it("returns false for invalid regex", () => {
    const p = compileCommandPattern({ pattern: "[bad", regex: true });
    assert.ok(!p.test("anything"));
  });
});

describe("compileFilePatterns", () => {
  it("compiles multiple patterns", () => {
    const patterns = compileFilePatterns([
      { pattern: ".env" },
      { pattern: ".env.*" },
    ]);
    assert.equal(patterns.length, 2);
    assert.ok(patterns[0]?.test(".env"));
    assert.ok(patterns[1]?.test(".env.local"));
  });
});

describe("compileCommandPatterns", () => {
  it("compiles multiple patterns", () => {
    const patterns = compileCommandPatterns([
      { pattern: "rm -rf" },
      { pattern: "sudo" },
    ]);
    assert.equal(patterns.length, 2);
    assert.ok(patterns[0]?.test("rm -rf /tmp"));
    assert.ok(patterns[1]?.test("sudo ls"));
  });
});
