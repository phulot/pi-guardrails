import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GuardrailsConfig } from "../config";
import {
  CURRENT_VERSION,
  migrateEnvFilesToPolicies,
  migrateV0,
  needsEnvFilesToPoliciesMigration,
  needsMigration,
} from "../utils/migration";

describe("needsMigration", () => {
  it("returns true when no version field", () => {
    assert.ok(needsMigration({} as GuardrailsConfig));
  });

  it("returns false when version is set", () => {
    assert.ok(!needsMigration({ version: "1.0.0" }));
  });
});

describe("migrateV0", () => {
  it("sets current version", () => {
    const result = migrateV0({});
    assert.equal(result.version, CURRENT_VERSION);
  });

  it("migrates envFiles string patterns to PatternConfig with regex: true", () => {
    const config = {
      envFiles: {
        protectedPatterns: [{ pattern: "\\.env$" }],
        allowedPatterns: [{ pattern: "\\.env\\.example$" }],
      },
    } as unknown as GuardrailsConfig;
    const result = migrateV0(config);
    assert.ok(result.envFiles?.protectedPatterns?.[0]?.regex === true);
    assert.ok(result.envFiles?.allowedPatterns?.[0]?.regex === true);
  });

  it("migrates permissionGate patterns", () => {
    const config = {
      permissionGate: {
        patterns: [{ pattern: "rm -rf", description: "force delete" }],
        allowedPatterns: [{ pattern: "echo" }],
        autoDenyPatterns: [{ pattern: "dd if=" }],
      },
    } as unknown as GuardrailsConfig;
    const result = migrateV0(config);
    assert.ok(result.permissionGate?.patterns?.[0]?.regex === true);
    assert.ok(result.permissionGate?.allowedPatterns?.[0]?.regex === true);
    assert.ok(result.permissionGate?.autoDenyPatterns?.[0]?.regex === true);
  });

  it("does not modify already-migrated PatternConfig objects", () => {
    const config: GuardrailsConfig = {
      envFiles: {
        protectedPatterns: [{ pattern: ".env", regex: false }],
      },
    };
    const result = migrateV0(config);
    assert.equal(result.envFiles?.protectedPatterns?.[0]?.regex, false);
  });
});

describe("needsEnvFilesToPoliciesMigration", () => {
  it("returns true when envFiles is present", () => {
    const config = { envFiles: { protectedPatterns: [] } } as GuardrailsConfig;
    assert.ok(needsEnvFilesToPoliciesMigration(config));
  });

  it("returns true when features.protectEnvFiles is present", () => {
    const config = {
      features: { protectEnvFiles: true },
    } as unknown as GuardrailsConfig;
    assert.ok(needsEnvFilesToPoliciesMigration(config));
  });

  it("returns false for clean config", () => {
    const config: GuardrailsConfig = {
      version: CURRENT_VERSION,
      enabled: true,
    };
    assert.ok(!needsEnvFilesToPoliciesMigration(config));
  });
});

describe("migrateEnvFilesToPolicies", () => {
  it("migrates features.protectEnvFiles to features.policies", () => {
    const config = {
      features: { protectEnvFiles: true },
    } as unknown as GuardrailsConfig;
    const result = migrateEnvFilesToPolicies(config);
    const features = result.features as Record<string, unknown> | undefined;
    assert.equal(features?.policies, true);
    assert.equal(features?.protectEnvFiles, undefined);
  });

  it("migrates envFiles to policies.rules with id secret-files", () => {
    const config: GuardrailsConfig = {
      envFiles: {
        protectedPatterns: [{ pattern: ".env" }],
        allowedPatterns: [{ pattern: ".env.example" }],
        onlyBlockIfExists: false,
        blockMessage: "Custom block",
      },
    };
    const result = migrateEnvFilesToPolicies(config);
    const rules = result.policies?.rules;
    assert.ok(rules);
    assert.equal(rules.length, 1);
    const rule = rules[0];
    assert.ok(rule);
    assert.equal(rule.id, "secret-files");
    assert.equal(rule.protection, "noAccess");
    assert.equal(rule.onlyIfExists, false);
    assert.equal(rule.blockMessage, "Custom block");
    assert.equal(
      (result as unknown as Record<string, unknown>).envFiles,
      undefined,
    );
  });

  it("migrates protectedDirectories into patterns with /** suffix", () => {
    const config: GuardrailsConfig = {
      envFiles: {
        protectedPatterns: [{ pattern: ".env" }],
        protectedDirectories: [{ pattern: "secrets" }],
      },
    };
    const result = migrateEnvFilesToPolicies(config);
    const rules = result.policies?.rules;
    assert.ok(rules);
    const rule = rules[0];
    assert.ok(rule);
    const dirPattern = rule.patterns.find((p) => p.pattern.includes("secrets"));
    assert.ok(dirPattern);
    assert.equal(dirPattern.pattern, "secrets/**");
  });

  it("uses default patterns when envFiles has no protectedPatterns", () => {
    const config: GuardrailsConfig = {
      envFiles: {},
    };
    const result = migrateEnvFilesToPolicies(config);
    const rules = result.policies?.rules;
    assert.ok(rules);
    const rule = rules[0];
    assert.ok(rule);
    assert.ok(rule.patterns.length > 0);
    assert.ok(rule.patterns.some((p) => p.pattern === ".env"));
  });

  it("sets current version after migration", () => {
    const result = migrateEnvFilesToPolicies({ envFiles: {} });
    assert.equal(result.version, CURRENT_VERSION);
  });
});
