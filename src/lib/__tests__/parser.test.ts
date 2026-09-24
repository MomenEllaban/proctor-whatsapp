import { describe, expect, it } from "vitest";
import {
  cleanName,
  countBrokenRows,
  parseLine,
  parseProctorsFromText,
} from "../parser";

describe("parseProctorsFromText", () => {
  it("parses tab-separated name and number", () => {
    const rows = parseProctorsFromText("مراقب تجريبي 01\t201000000001");
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("مراقب تجريبي 01");
    expect(rows[0].rawPhone).toBe("201000000001");
  });

  it("parses comma and dash separated content", () => {
    expect(parseLine("مراقب تجريبي 02, 01000000002").rawPhone).toBe("01000000002");
    expect(parseLine("مراقب تجريبي 03 - 01100000003").rawPhone).toBe("01100000003");
    expect(parseLine("مراقب تجريبي 04 — 01200000004").rawPhone).toBe("01200000004");
  });

  it("parses when the number comes first", () => {
    const row = parseLine("01000000005 - مراقب تجريبي 05");
    expect(row.name).toBe("مراقب تجريبي 05");
    expect(row.rawPhone).toBe("01000000005");
  });

  it("parses numbers written with spaces and dashes", () => {
    const row = parseLine("مراقب تجريبي 06    +20 100 000 0006");
    expect(row.rawPhone).toBe("20 100 000 0006");
    expect(row.name).toBe("مراقب تجريبي 06");
  });

  it("handles Arabic and Persian digits", () => {
    expect(parseLine("مراقب\t٠١٠٠٠٠٠٠٠٠٧").rawPhone).toBe("٠١٠٠٠٠٠٠٠٠٧");
  });

  it("drops an Excel row index column", () => {
    const row = parseLine("1\tمراقب تجريبي 08\t01000000008");
    expect(row.name).toBe("مراقب تجريبي 08");
    expect(row.rawPhone).toBe("01000000008");
  });

  it("keeps names verbatim except for trimming surrounding punctuation", () => {
    expect(cleanName(" مراقب تجريبي 09  ")).toBe("مراقب تجريبي 09");
    expect(cleanName("- مراقب تجريبي 10 -")).toBe("مراقب تجريبي 10");
    expect(cleanName("رقم: مراقب تجريبي 11")).toBe("مراقب تجريبي 11");
  });

  it("produces a name-only row (empty phone) instead of dropping it", () => {
    const rows = parseProctorsFromText("مراقب تجريبي بلا رقم");
    expect(rows).toHaveLength(1);
    expect(rows[0].rawPhone).toBe("");
  });

  it("produces a phone-only row (empty name) instead of dropping it", () => {
    const rows = parseProctorsFromText("01000000012");
    expect(rows[0].name).toBe("");
    expect(rows[0].rawPhone).toBe("01000000012");
  });

  it("parses many mixed lines at once", () => {
    const text = [
      "مراقب تجريبي 13\t201000000013",
      "مراقب تجريبي 14\t201000000014",
      "مراقب تجريبي 15\t011000000015",
      "مراقب تجريبي 16\t201000000016",
      "مراقب تجريبي 17\t201000000017",
    ].join("\n");
    const rows = parseProctorsFromText(text);
    expect(rows).toHaveLength(5);
    expect(rows[0].name).toBe("مراقب تجريبي 13");
    expect(rows[2].rawPhone).toBe("011000000015");
  });

  it("ignores empty and whitespace-only lines", () => {
    expect(parseProctorsFromText("\n\n   \nمراقب\t201000000001\n\n")).toHaveLength(1);
  });

  it("counts rows missing a name or a number as broken", () => {
    const rows = parseProctorsFromText(
      "مراقب\t201000000001\nفقط اسم\nفقط رقم 01000000001\n\n",
    );
    expect(rows).toHaveLength(3);
    expect(countBrokenRows(rows)).toBe(1);
  });
});
