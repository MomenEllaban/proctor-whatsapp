import { describe, expect, it } from "vitest";
import { normalizePhone } from "../normalizePhone";

export const SAMPLE_STUDENTS: { name: string; phone: string }[] = [
  { name: "مراقب تجريبي 01", phone: "201000000001" },
  { name: "مراقب تجريبي 02", phone: "201000000002" },
  { name: "مراقب تجريبي 03", phone: "201000000003" },
  { name: "مراقب تجريبي 04", phone: "201000000004" },
  { name: "مراقب تجريبي 05", phone: "201000000005" },
  { name: "مراقب تجريبي 06", phone: "201000000006" },
  { name: "مراقب تجريبي 07", phone: "201000000007" },
  { name: "مراقب تجريبي 08", phone: "201000000008" },
  { name: "مراقب تجريبي 09", phone: "201000000009" },
  { name: "مراقب تجريبي 10", phone: "201000000010" },
  { name: "مراقب تجريبي 11", phone: "201000000011" },
  { name: "مراقب تجريبي 12", phone: "201000000012" },
  { name: "مراقب تجريبي 13", phone: "201000000013" },
  { name: "مراقب تجريبي 14", phone: "201000000014" },
  { name: "مراقب تجريبي 15", phone: "201000000015" },
  { name: "مراقب تجريبي 16", phone: "201000000016" },
  { name: "مراقب تجريبي 17", phone: "201000000017" },
];

describe("normalizePhone", () => {
  it.each([...SAMPLE_STUDENTS])(
    "keeps a normalized international fixture unchanged: $name -> $phone",
    ({ name, phone }) => {
      const res = normalizePhone(phone);
      expect(res.valid).toBe(true);
      expect(res.phone).toBe(phone);
      expect(name.length).toBeGreaterThan(0);
    },
  );

  it.each([
    ["01000000001", "201000000001"],
    ["01000000002", "201000000002"],
    ["01100000004", "201100000004"],
    ["01200000003", "201200000003"],
    ["01500000005", "201500000005"],
  ])("local Egyptian mobile %s -> %s", (input, expected) => {
    expect(normalizePhone(input).phone).toBe(expected);
  });

  it.each([
    ["00201000000001", "201000000001"],
    ["+201000000001", "201000000001"],
    ["201000000001", "201000000001"],
    ["0020 100 000 0001", "201000000001"],
  ])("already-international %s -> %s", (input, expected) => {
    expect(normalizePhone(input).phone).toBe(expected);
  });

  it.each([
    ["٠١٠٠٠٠٠٠٠٠١", "201000000001"],
    ["۰۱۰۰۰۰۰۰۰۰۱", "201000000001"],
    ["٠١٠-٠٠٠ ٠٠٠٠١", "201000000001"],
  ])("Arabic/Persian digits %s -> %s", (input, expected) => {
    expect(normalizePhone(input).phone).toBe(expected);
  });

  it.each([
    ["010 000 00001", "201000000001"],
    ["010-000-00001", "201000000001"],
    ["(010) 00000001", "201000000001"],
    ["010.000.00001", "201000000001"],
    ["+20 100 000 0001", "201000000001"],
    ["٠١٠٠٠٠٠٠٠٠١", "201000000001"],
  ])("messy separators %s -> %s", (input, expected) => {
    expect(normalizePhone(input).phone).toBe(expected);
  });

  it("keeps non-Egypt international numbers that look valid", () => {
    expect(normalizePhone("+966 55 123 4567").phone).toBe("966551234567");
    expect(normalizePhone("00447911123456").phone).toBe("447911123456");
    expect(normalizePhone("1 (312) 555-0199").phone).toBe("13125550199");
  });

  it("respects a non-Egypt default country code", () => {
    expect(normalizePhone("05012345678", "966").valid).toBe(false);
    expect(normalizePhone("966501234567", "966").phone).toBe("966501234567");
  });

  it("marks invalid numbers with a clear Arabic reason", () => {
    expect(normalizePhone("")).toMatchObject({
      valid: false,
      phone: null,
      message: "الرقم فارغ",
    });
    expect(normalizePhone("   ").valid).toBe(false);
    expect(normalizePhone("abc").valid).toBe(false);
    expect(normalizePhone("abc01000000001").valid).toBe(false);
    expect(normalizePhone("123").valid).toBe(false);
    expect(normalizePhone("0234567890").valid).toBe(false);
    expect(normalizePhone("0123456789").valid).toBe(false);
    expect(normalizePhone("20100000001").valid).toBe(false);
    expect(normalizePhone("205123456789").valid).toBe(false);
  });
});
