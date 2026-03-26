import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parse } from "@aliou/sh";
import { checkBuiltinDangerous } from "../hooks/permission-gate";
import { walkCommands, wordToString } from "../utils/shell-utils";

/**
 * Parse a shell command and run checkBuiltinDangerous on each SimpleCommand.
 * Returns the first match description, or undefined.
 */
function detect(command: string): string | undefined {
  const { ast } = parse(command);
  let result: string | undefined;
  walkCommands(ast, (cmd) => {
    const words = (cmd.words ?? []).map(wordToString);
    const match = checkBuiltinDangerous(words);
    if (match) {
      result = match.description;
      return true;
    }
    return false;
  });
  return result;
}

// ── rm -rf ────────────────────────────────────────────────────────────

describe("checkBuiltinDangerous — rm -rf", () => {
  it("détecte rm -rf", () => {
    assert.equal(detect("rm -rf /tmp/dir"), "recursive force delete");
  });

  it("détecte rm -fr (flags inversés)", () => {
    assert.equal(detect("rm -fr /tmp/dir"), "recursive force delete");
  });

  it("détecte rm -rf avec chemin courant", () => {
    assert.ok(detect("rm -rf ."));
  });

  it("ne déclenche pas rm -r sans -f", () => {
    assert.equal(detect("rm -r /tmp/dir"), undefined);
  });

  it("ne déclenche pas rm -f sans -r", () => {
    assert.equal(detect("rm -f file.txt"), undefined);
  });

  it("ne déclenche pas rm sans flags", () => {
    assert.equal(detect("rm file.txt"), undefined);
  });

  it("détecte rm -rf dans un pipeline", () => {
    assert.ok(detect("echo 'cleaning' && rm -rf build/"));
  });
});

// ── sudo ──────────────────────────────────────────────────────────────

describe("checkBuiltinDangerous — sudo", () => {
  it("détecte sudo", () => {
    assert.equal(detect("sudo apt install vim"), "superuser command");
  });

  it("détecte sudo seul", () => {
    assert.equal(detect("sudo -i"), "superuser command");
  });

  it("ne déclenche pas sur un mot contenant sudo mais différent", () => {
    assert.equal(detect("echo 'sudo is disabled'"), undefined);
  });

  it("détecte sudo dans une commande chaînée", () => {
    assert.ok(detect("cd /tmp && sudo rm file"));
  });
});

// ── dd if= ────────────────────────────────────────────────────────────

describe("checkBuiltinDangerous — dd", () => {
  it("détecte dd if=/dev/zero", () => {
    assert.equal(
      detect("dd if=/dev/zero of=/dev/sda bs=1M"),
      "disk write operation",
    );
  });

  it("détecte dd if=fichier", () => {
    assert.equal(
      detect("dd if=backup.img of=/dev/sdb"),
      "disk write operation",
    );
  });

  it("ne déclenche pas dd sans if=", () => {
    assert.equal(detect("dd of=/dev/null bs=1M count=1"), undefined);
  });

  it("ne déclenche pas sur un autre programme", () => {
    assert.equal(detect("echo 'dd if=test'"), undefined);
  });
});

// ── mkfs ─────────────────────────────────────────────────────────────

describe("checkBuiltinDangerous — mkfs", () => {
  it("détecte mkfs.ext4", () => {
    assert.equal(detect("mkfs.ext4 /dev/sdb1"), "filesystem format");
  });

  it("détecte mkfs.vfat", () => {
    assert.equal(detect("mkfs.vfat /dev/sdc"), "filesystem format");
  });

  it("détecte mkfs.xfs", () => {
    assert.equal(detect("mkfs.xfs /dev/sdd"), "filesystem format");
  });

  it("ne déclenche pas sur echo mkfs.", () => {
    assert.equal(detect("echo 'mkfs.ext4'"), undefined);
  });
});

// ── chmod -R 777 ─────────────────────────────────────────────────────

describe("checkBuiltinDangerous — chmod -R 777", () => {
  it("détecte chmod -R 777", () => {
    assert.equal(
      detect("chmod -R 777 /var/www"),
      "insecure recursive permissions",
    );
  });

  it("détecte chmod 777 -R (ordre inversé)", () => {
    assert.equal(
      detect("chmod 777 -R /var/www"),
      "insecure recursive permissions",
    );
  });

  it("ne déclenche pas chmod 755 -R (permissions sûres)", () => {
    assert.equal(detect("chmod -R 755 /var/www"), undefined);
  });

  it("ne déclenche pas chmod 777 sans -R", () => {
    assert.equal(detect("chmod 777 file.sh"), undefined);
  });

  it("ne déclenche pas chmod -R 644", () => {
    assert.equal(detect("chmod -R 644 /etc/config"), undefined);
  });
});

// ── chown -R ─────────────────────────────────────────────────────────

describe("checkBuiltinDangerous — chown -R", () => {
  it("détecte chown -R", () => {
    assert.equal(
      detect("chown -R www-data:www-data /var/www"),
      "recursive ownership change",
    );
  });

  it("détecte chown -R root /", () => {
    assert.equal(detect("chown -R root /"), "recursive ownership change");
  });

  it("ne déclenche pas chown sans -R", () => {
    assert.equal(detect("chown user:group file.txt"), undefined);
  });
});

// ── Commandes sûres — pas de faux positifs ────────────────────────────

describe("checkBuiltinDangerous — pas de faux positifs", () => {
  it("ne déclenche pas sur git commit", () => {
    assert.equal(detect('git commit -m "feat: add tests"'), undefined);
  });

  it("ne déclenche pas sur npm install", () => {
    assert.equal(detect("npm install"), undefined);
  });

  it("ne déclenche pas sur ls -la", () => {
    assert.equal(detect("ls -la /tmp"), undefined);
  });

  it("ne déclenche pas sur cp -r (sans f)", () => {
    assert.equal(detect("cp -r src/ dest/"), undefined);
  });

  it("ne déclenche pas sur une commande vide", () => {
    assert.equal(detect("echo hello"), undefined);
  });
});
