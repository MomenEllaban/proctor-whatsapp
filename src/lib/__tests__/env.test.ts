import { describe, expect, it } from "vitest";
import {
  authPolicyError,
  isAllowedDomain,
  lockedDomainsHint,
} from "../env";

describe("email policy (open by default)", () => {
  it("accepts any valid email when no domain lock is configured", () => {
    expect(lockedDomainsHint()).toBeNull();
    expect(isAllowedDomain("user1@example.com")).toBe(true);
    expect(isAllowedDomain("user@gmail.com")).toBe(true);
    expect(isAllowedDomain("user@company.com")).toBe(true);
  });

  it("still rejects malformed addresses", () => {
    expect(isAllowedDomain("")).toBe(false);
    expect(isAllowedDomain("not-an-email")).toBe(false);
    expect(isAllowedDomain("two@@example.com")).toBe(false);
  });

  it("never blocks sign-up when the system is open", () => {
    expect(authPolicyError("user1@example.com", "")).toBeNull();
    expect(authPolicyError("user@company.com", "")).toBeNull();
    expect(authPolicyError("bad-email", "")).toContain("غير مسموح");
  });
});
