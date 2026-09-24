import { describe, expect, it } from "vitest";
import { parseJsonRows } from "../extract";

describe("parseJsonRows", () => {
  it("parses fenced JSON and normalizes digits", () => {
    const rows = parseJsonRows(
      '```json\n[{"name":"  مراقب تجريبي  ","phone":"٠١٠٠٠٠٠٠٠٠١"}]\n```',
    );
    expect(rows).toEqual([{ name: "مراقب تجريبي", phone: "01000000001" }]);
  });

  it("keeps incomplete rows for the review screen", () => {
    expect(parseJsonRows('[{"name":"بدون رقم","phone":""},{"name":"","phone":"201000000002"}]')).toEqual([
      { name: "بدون رقم", phone: "" },
      { name: "", phone: "201000000002" },
    ]);
  });

  it("caps unexpectedly large model responses", () => {
    const rows = Array.from(
      { length: 600 },
      (_, index) => ({
        name: `مراقب ${index}`,
        phone: `201000${String(index).padStart(6, "0")}`,
      }),
    );
    expect(parseJsonRows(JSON.stringify(rows))).toHaveLength(500);
  });
});
