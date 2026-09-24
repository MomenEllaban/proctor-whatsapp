import { describe, expect, it } from "vitest";
import { digitsOnly, matchesQuery, normArabic, toWesternDigits } from "../arabic";

describe("normArabic", () => {
  it("normalizes alef/hamza, ya, taa marbuta and harakat", () => {
    expect(normArabic("أحمد إبراهيم").replace(/\s+/g, " ")).toBe(
      normArabic("احمد ابراهيم").replace(/\s+/g, " "),
    );
    expect(normArabic("مدرسة")).toBe("مدرسه");
    expect(normArabic("أحمد")).toBe("احمد");
    expect(normArabic("شريف")).toBe("شريف");
  });

  it("collapses whitespace", () => {
    expect(normArabic("خالد   محمود")).toBe("خالد محمود");
  });
});

describe("toWesternDigits", () => {
  it("converts Arabic-Indic and Persian digits", () => {
    expect(toWesternDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toWesternDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(toWesternDigits("محمود 2010")).toBe("محمود 2010");
  });
});

describe("digitsOnly", () => {
  it("returns only digits", () => {
    expect(digitsOnly("+20 (100) 000-0001")).toBe("201000000001");
  });
});

describe("matchesQuery", () => {
  const p = { name: "مراقب تجريبي 12", phone: "201000000012" };
  it("matches by partial normalized Arabic name", () => {
    expect(matchesQuery("مراقب", p.name, p.phone)).toBe(true);
    expect(matchesQuery("تجريبي", p.name, p.phone)).toBe(true);
    expect(matchesQuery("اسم آخر", p.name, p.phone)).toBe(false);
  });
  it("matches by digit fragment of the phone", () => {
    expect(matchesQuery("0000012", p.name, p.phone)).toBe(true);
    expect(matchesQuery("201000", p.name, p.phone)).toBe(true);
    expect(matchesQuery("201000000012", p.name, p.phone)).toBe(true);
    expect(matchesQuery("٢٠١٠٠٠٠٠٠٠١٢", p.name, p.phone)).toBe(true);
  });
  it("empty query matches everything", () => {
    expect(matchesQuery("", p.name, p.phone)).toBe(true);
  });
});
