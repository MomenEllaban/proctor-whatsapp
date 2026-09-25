import { describe, expect, it } from "vitest";
import { authPolicyError, isAdminEmail, isAllowedDomain } from "../env";

describe("university email policy", () => {
  it("accepts only the Horus domain", () => {
    expect(isAllowedDomain("user1@horus.edu.eg")).toBe(true);
    expect(isAllowedDomain("Admin@Horus.edu.eg")).toBe(true);
    expect(isAllowedDomain("someone@gmail.com")).toBe(false);
    expect(isAllowedDomain("someone@horus.edu.eg.evil.com")).toBe(false);
    expect(isAllowedDomain("")).toBe(false);
  });

  it("blocks sign-up from other domains with an Arabic message", () => {
    const error = authPolicyError("someone@gmail.com", "");
    expect(error).toContain("@horus.edu.eg");
    expect(authPolicyError("user1@horus.edu.eg", "")).toBeNull();
  });

  it("promotes the configured admin emails", () => {
    expect(isAdminEmail("admin@horus.edu.eg")).toBe(true);
    expect(isAdminEmail("user1@horus.edu.eg")).toBe(false);
  });
});
