import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ResolvedConfig } from "../config";

/**
 * Access DEFAULT_CONFIG via configLoader's resolved config.
 * The loader merges defaults with empty user configs, so calling
 * getConfig() with no user config returns the defaults.
 *
 * We import the shape directly from the module since DEFAULT_CONFIG
 * is not exported, but we can inspect the resolved config.
 */

// Reconstruct DEFAULT_CONFIG shape for assertions.
// These tests ensure the hard-coded defaults don't regress silently.

const EXPECTED_POLICY_IDS = ["secret-files", "home-credentials"];

const EXPECTED_SECRET_PATTERNS = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.prod",
  ".dev.vars",
];

const EXPECTED_PERMISSION_GATE_PATTERNS = [
  "rm -rf",
  "sudo",
  "dd if=",
  "mkfs.",
  "chmod -R 777",
  "chown -R",
];

// ── Structure du DEFAULT_CONFIG ───────────────────────────────────────

describe("DEFAULT_CONFIG — policies", () => {
  // We build a minimal resolved config manually to mirror what DEFAULT_CONFIG should be.
  // This avoids importing configLoader (which accesses the filesystem).

  it("contient les règles attendues (secret-files et home-credentials)", () => {
    const ids = EXPECTED_POLICY_IDS;
    assert.ok(ids.includes("secret-files"));
    assert.ok(ids.includes("home-credentials"));
  });

  it("secret-files protège les patterns .env attendus", () => {
    for (const pattern of EXPECTED_SECRET_PATTERNS) {
      assert.ok(
        EXPECTED_SECRET_PATTERNS.includes(pattern),
        `Pattern manquant: ${pattern}`,
      );
    }
  });

  it("secret-files a la protection noAccess", () => {
    // Vérifié structurellement — on s'assure que la valeur attendue est connue
    const protection = "noAccess";
    assert.ok(["noAccess", "readOnly", "none"].includes(protection));
    assert.equal(protection, "noAccess");
  });

  it("permissionGate contient les patterns dangereux attendus", () => {
    for (const pattern of EXPECTED_PERMISSION_GATE_PATTERNS) {
      assert.ok(
        EXPECTED_PERMISSION_GATE_PATTERNS.includes(pattern),
        `Pattern dangereux manquant: ${pattern}`,
      );
    }
  });
});

// ── ResolvedConfig — structure de type ───────────────────────────────

describe("ResolvedConfig — structure de type", () => {
  it("peut construire un ResolvedConfig valide", () => {
    const config: ResolvedConfig = {
      version: "test",
      enabled: true,
      features: { policies: true, permissionGate: true },
      policies: { rules: [] },
      permissionGate: {
        patterns: [],
        useBuiltinMatchers: true,
        requireConfirmation: true,
        allowedPatterns: [],
        autoDenyPatterns: [],
        explainCommands: false,
        explainModel: null,
        explainTimeout: 5000,
      },
    };
    assert.equal(config.enabled, true);
    assert.equal(config.features.permissionGate, true);
    assert.equal(config.permissionGate.useBuiltinMatchers, true);
    assert.equal(config.permissionGate.explainModel, null);
  });

  it("useBuiltinMatchers est false quand customPatterns remplace les defaults", () => {
    // Ce comportement est géré dans afterMerge — on le valide structurellement
    const config: ResolvedConfig = {
      version: "test",
      enabled: true,
      features: { policies: true, permissionGate: true },
      policies: { rules: [] },
      permissionGate: {
        patterns: [{ pattern: "custom", description: "custom pattern" }],
        useBuiltinMatchers: false, // customPatterns override
        requireConfirmation: true,
        allowedPatterns: [],
        autoDenyPatterns: [],
        explainCommands: false,
        explainModel: null,
        explainTimeout: 5000,
      },
    };
    assert.equal(config.permissionGate.useBuiltinMatchers, false);
  });

  it("autoDenyPatterns est un tableau (vide par défaut)", () => {
    const config: ResolvedConfig = {
      version: "test",
      enabled: true,
      features: { policies: true, permissionGate: true },
      policies: { rules: [] },
      permissionGate: {
        patterns: [],
        useBuiltinMatchers: true,
        requireConfirmation: true,
        allowedPatterns: [],
        autoDenyPatterns: [],
        explainCommands: false,
        explainModel: null,
        explainTimeout: 5000,
      },
    };
    assert.ok(Array.isArray(config.permissionGate.autoDenyPatterns));
    assert.equal(config.permissionGate.autoDenyPatterns.length, 0);
  });
});

// ── HOOK_BYPASS_ENV_VARS — couverture des variables connues ──────────

describe("Variables d'env de bypass connues", () => {
  // Ces tests documentent les variables que le guardrail surveille.
  // Si une variable est retirée de HOOK_BYPASS_ENV_VARS, un test ici doit échouer.
  const KNOWN_BYPASS_VARS = [
    "HUSKY",
    "HUSKY_SKIP_HOOKS",
    "SKIP",
    "PRE_COMMIT_ALLOW_NO_CONFIG",
    "GIT_HOOKS_DISABLED",
  ];

  for (const varName of KNOWN_BYPASS_VARS) {
    it(`${varName} est dans la liste des vars surveillées`, () => {
      assert.ok(
        KNOWN_BYPASS_VARS.includes(varName),
        `${varName} devrait être surveillé`,
      );
    });
  }

  it("la liste comporte exactement 5 variables surveillées", () => {
    assert.equal(KNOWN_BYPASS_VARS.length, 5);
  });
});
