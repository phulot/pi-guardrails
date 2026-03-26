import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parse } from "@aliou/sh";
import { checkPreCommitBypass } from "../hooks/permission-gate";
import { walkCommands, wordToString } from "../utils/shell-utils";

/**
 * Helper: parse a shell command and run checkPreCommitBypass on each
 * SimpleCommand found. Returns the first match description, or undefined.
 */
function detect(command: string): string | undefined {
  const { ast } = parse(command);
  let result: string | undefined;
  walkCommands(ast, (cmd) => {
    const words = (cmd.words ?? []).map(wordToString);
    const desc = checkPreCommitBypass(words, cmd.assignments);
    if (desc) {
      result = desc;
      return true;
    }
    return false;
  });
  return result;
}

// ── --no-verify ────────────────────────────────────────────────────────

describe("checkPreCommitBypass — --no-verify flag", () => {
  it("détecte git commit --no-verify", () => {
    assert.ok(detect('git commit --no-verify -m "wip"'));
  });

  it("détecte git commit --no-verify sans message", () => {
    assert.ok(detect("git commit --no-verify"));
  });

  it("détecte git push --no-verify", () => {
    assert.ok(detect("git push --no-verify"));
  });

  it("détecte git push origin main --no-verify", () => {
    assert.ok(detect("git push origin main --no-verify"));
  });

  it("détecte --no-verify placé avant les autres flags", () => {
    assert.ok(detect('git commit --no-verify --all -m "msg"'));
  });

  it("ne déclenche pas sur git status", () => {
    assert.equal(detect("git status --no-verify"), undefined);
  });

  it("ne déclenche pas sur git commit sans flag de bypass", () => {
    assert.equal(detect('git commit -m "fix: typo"'), undefined);
  });

  it("ne déclenche pas sur un commit normal avec --amend", () => {
    assert.equal(detect("git commit --amend --no-edit"), undefined);
  });
});

// ── -n (short flag) ────────────────────────────────────────────────────

describe("checkPreCommitBypass — short flag -n", () => {
  it("détecte git commit -n", () => {
    assert.ok(detect("git commit -n"));
  });

  it("détecte git commit -n -m message", () => {
    assert.ok(detect('git commit -n -m "wip"'));
  });

  it("ne déclenche pas sur git clone -n (no-checkout, autre sémantique)", () => {
    // On ne cherche le bypass que sur git commit/push
    assert.equal(detect("git clone -n https://github.com/foo/bar"), undefined);
  });
});

// ── Variables d'env qui désactivent les hooks ──────────────────────────

describe("checkPreCommitBypass — env vars bypass", () => {
  it("détecte HUSKY=0 git commit", () => {
    assert.ok(detect('HUSKY=0 git commit -m "msg"'));
  });

  it("détecte HUSKY_SKIP_HOOKS=1 git commit", () => {
    assert.ok(detect('HUSKY_SKIP_HOOKS=1 git commit -m "msg"'));
  });

  it("détecte SKIP=lint git commit", () => {
    assert.ok(detect('SKIP=lint git commit -m "msg"'));
  });

  it("détecte PRE_COMMIT_ALLOW_NO_CONFIG=1 git commit", () => {
    assert.ok(detect('PRE_COMMIT_ALLOW_NO_CONFIG=1 git commit -m "msg"'));
  });

  it("détecte GIT_HOOKS_DISABLED=1 git commit", () => {
    assert.ok(detect('GIT_HOOKS_DISABLED=1 git commit -m "msg"'));
  });

  it("détecte HUSKY=0 git push", () => {
    assert.ok(detect("HUSKY=0 git push origin main"));
  });

  it("ne déclenche pas pour une variable inconnue", () => {
    assert.equal(detect('MY_VAR=1 git commit -m "msg"'), undefined);
  });

  it("ne déclenche pas pour HUSKY=0 sans git commit/push", () => {
    assert.equal(detect("HUSKY=0 npm install"), undefined);
  });
});

// ── Commandes non-git ──────────────────────────────────────────────────

describe("checkPreCommitBypass — commandes non-git", () => {
  it("ne déclenche pas sur rm --no-verify", () => {
    assert.equal(detect("rm --no-verify file.txt"), undefined);
  });

  it("ne déclenche pas sur npm run commit --no-verify", () => {
    // npm run commit n'est pas git commit
    assert.equal(detect("npm run commit --no-verify"), undefined);
  });
});
