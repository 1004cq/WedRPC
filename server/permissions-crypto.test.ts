import { describe, expect, it } from "vitest";
import { encrypt, decrypt } from "./crypto";
import { can } from "./permissions";

describe("RBAC permission matrix", () => {
  it("separates audit, settings, and capture privileges", () => {
    expect(can("admin", "manage_settings")).toBe(true);
    expect(can("auditor", "view_audit")).toBe(true);
    expect(can("auditor", "manage_settings")).toBe(false);
    expect(can("viewer", "manage_captures")).toBe(false);
    expect(can("operator", "manage_captures")).toBe(true);
  });
});

describe("AES sensitive data protection", () => {
  it("round-trips GPS and fingerprint values without storing plaintext", () => {
    const plain = "31.2304,121.4737|canvas-hash";
    const encrypted = encrypt(plain);
    expect(encrypted).not.toContain(plain);
    expect(decrypt(encrypted)).toBe(plain);
  });

  it("keeps legacy plaintext values readable during migration", () => {
    expect(decrypt("legacy-value")).toBe("legacy-value");
  });
});
