import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parse } from "@aliou/sh";
import { walkCommands, wordToString } from "../utils/shell-utils";

/**
 * Collect all first words of SimpleCommands found in a shell command.
 */
function collectFirstWords(command: string): string[] {
  const { ast } = parse(command);
  const result: string[] = [];
  walkCommands(ast, (cmd) => {
    const words = (cmd.words ?? []).map(wordToString);
    if (words[0]) result.push(words[0]);
    return false;
  });
  return result;
}

/**
 * Collect all words of every SimpleCommand.
 */
function collectAllWords(command: string): string[][] {
  const { ast } = parse(command);
  const result: string[][] = [];
  walkCommands(ast, (cmd) => {
    result.push((cmd.words ?? []).map(wordToString));
    return false;
  });
  return result;
}

// ── wordToString ──────────────────────────────────────────────────────

describe("wordToString", () => {
  it("résout un littéral simple", () => {
    const { ast } = parse("echo hello");
    const words: string[] = [];
    walkCommands(ast, (cmd) => {
      words.push(...(cmd.words ?? []).map(wordToString));
      return false;
    });
    assert.deepEqual(words, ["echo", "hello"]);
  });

  it("résout une chaîne entre guillemets simples", () => {
    const words = collectAllWords("echo 'hello world'");
    assert.deepEqual(words[0], ["echo", "hello world"]);
  });

  it("résout une chaîne entre guillemets doubles", () => {
    const words = collectAllWords('echo "hello world"');
    assert.deepEqual(words[0], ["echo", "hello world"]);
  });

  it("résout une variable $VAR dans une chaîne double", () => {
    const words = collectAllWords('echo "$HOME"');
    assert.ok(words[0][1].includes("HOME"));
  });

  it("résout les flags avec tirets", () => {
    const words = collectAllWords("rm -rf /tmp");
    assert.deepEqual(words[0], ["rm", "-rf", "/tmp"]);
  });
});

// ── walkCommands — commandes simples ─────────────────────────────────

describe("walkCommands — commandes simples", () => {
  it("trouve une commande simple", () => {
    assert.deepEqual(collectFirstWords("echo hello"), ["echo"]);
  });

  it("trouve plusieurs commandes séquentielles (;)", () => {
    const cmds = collectFirstWords("echo a; echo b; echo c");
    assert.deepEqual(cmds, ["echo", "echo", "echo"]);
  });

  it("trouve les deux côtés d'un &&", () => {
    const cmds = collectFirstWords("git add . && git commit -m 'msg'");
    assert.deepEqual(cmds, ["git", "git"]);
  });

  it("trouve les deux côtés d'un ||", () => {
    const cmds = collectFirstWords("test -f file || touch file");
    assert.deepEqual(cmds, ["test", "touch"]);
  });
});

// ── walkCommands — pipelines ──────────────────────────────────────────

describe("walkCommands — pipelines", () => {
  it("trouve toutes les commandes d'un pipeline", () => {
    const cmds = collectFirstWords("find . -name '*.ts' | xargs grep 'TODO'");
    assert.deepEqual(cmds, ["find", "xargs"]);
  });

  it("trouve toutes les commandes d'un pipeline à 3 éléments", () => {
    const cmds = collectFirstWords("cat file | grep pattern | wc -l");
    assert.deepEqual(cmds, ["cat", "grep", "wc"]);
  });
});

// ── walkCommands — sous-shells et blocs ──────────────────────────────

describe("walkCommands — sous-shells et blocs", () => {
  it("descend dans un sous-shell ()", () => {
    const cmds = collectFirstWords("(cd /tmp && rm -f file)");
    assert.deepEqual(cmds, ["cd", "rm"]);
  });

  it("descend dans un bloc {}", () => {
    const cmds = collectFirstWords("{ echo start; echo end; }");
    assert.deepEqual(cmds, ["echo", "echo"]);
  });
});

// ── walkCommands — structures de contrôle ────────────────────────────

describe("walkCommands — structures de contrôle", () => {
  it("descend dans un if/then/else", () => {
    const cmds = collectFirstWords(
      "if test -f file; then cat file; else touch file; fi",
    );
    assert.ok(cmds.includes("test"));
    assert.ok(cmds.includes("cat"));
    assert.ok(cmds.includes("touch"));
  });

  it("descend dans un for", () => {
    const cmds = collectFirstWords("for f in *.ts; do echo $f; done");
    assert.ok(cmds.includes("echo"));
  });

  it("descend dans un while", () => {
    const cmds = collectFirstWords("while true; do sleep 1; done");
    assert.ok(cmds.includes("sleep"));
  });
});

// ── walkCommands — arrêt anticipé ────────────────────────────────────

describe("walkCommands — arrêt anticipé (return true)", () => {
  it("s'arrête à la première commande si callback retourne true", () => {
    const { ast } = parse("echo a; echo b; echo c");
    const found: string[] = [];
    walkCommands(ast, (cmd) => {
      found.push((cmd.words ?? []).map(wordToString).join(" "));
      return true; // arrêt immédiat
    });
    assert.equal(found.length, 1);
    assert.equal(found[0], "echo a");
  });
});
