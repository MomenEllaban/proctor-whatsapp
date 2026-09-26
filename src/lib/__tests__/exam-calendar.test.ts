import { describe, expect, it } from "vitest";
import {
  autoExamDate,
  buildMessageTemplate,
  defaultMessageTemplate,
  formatExamDate,
  parseMessageTemplate,
  resolveExamRound,
  syncAutoExamDate,
  syncAutoExamDateTemplate,
} from "../message";

const OCT_9 = "يوم الجمعة الموافق 9 أكتوبر 2026";
const OCT_10 = "يوم السبت الموافق 10 أكتوبر 2026";
const DEC_11 = "يوم الجمعة الموافق 11 ديسمبر 2026";
const DEC_12 = "يوم السبت الموافق 12 ديسمبر 2026";

describe("exam date formatting", () => {
  it("writes the weekday that matches the calendar day", () => {
    expect(formatExamDate("2026-10-09")).toBe(OCT_9);
    expect(formatExamDate("2026-10-10")).toBe(OCT_10);
    expect(formatExamDate("2026-12-11")).toBe(DEC_11);
    expect(formatExamDate("2026-12-12")).toBe(DEC_12);
  });

  it("keeps unparsable input instead of throwing", () => {
    expect(formatExamDate("مش موجود")).toBe("مش موجود");
    expect(formatExamDate("2026-13-01")).toBe("2026-13-01");
    expect(formatExamDate("2026-02-30")).toBe("2026-02-30");
  });
});

describe("round selection", () => {
  it("uses the first round until 10 October is over", () => {
    for (const today of [
      "2026-09-26",
      "2026-10-01",
      "2026-10-09",
      "2026-10-10",
    ]) {
      expect(resolveExamRound(today).est1).toBe("2026-10-09");
      expect(autoExamDate("EST1", today)).toBe(OCT_9);
      expect(autoExamDate("EST2", today)).toBe(OCT_10);
    }
  });

  it("switches to the second round the day after 10 October", () => {
    for (const today of ["2026-10-11", "2026-11-01", "2026-12-11"]) {
      expect(resolveExamRound(today).est1).toBe("2026-12-11");
      expect(autoExamDate("EST1", today)).toBe(DEC_11);
      expect(autoExamDate("EST2", today)).toBe(DEC_12);
    }
  });

  it("keeps the last round once every round has passed", () => {
    expect(autoExamDate("EST1", "2027-03-01")).toBe(DEC_11);
  });

  it("falls back to the first round before the calendar starts", () => {
    expect(autoExamDate("EST1", "2026-01-01")).toBe(OCT_9);
  });

  it("accepts lowercase and spaced exam codes", () => {
    expect(autoExamDate("est 1", "2026-10-01")).toBe(OCT_9);
    expect(autoExamDate("est-2", "2026-10-01")).toBe(OCT_10);
  });

  it("never invents a date for a custom exam", () => {
    expect(autoExamDate("فيزياء 101", "2026-10-01")).toBeNull();
    expect(autoExamDate("", "2026-10-01")).toBeNull();
  });
});

describe("default message date", () => {
  it("follows the round instead of a hardcoded day", () => {
    expect(defaultMessageTemplate("2026-10-01")).toContain(OCT_9);
    expect(defaultMessageTemplate("2026-10-11")).toContain(DEC_11);
    expect(parseMessageTemplate(defaultMessageTemplate("2026-10-11")).exam).toBe(
      "EST1",
    );
  });
});

describe("moving a date left over from an earlier round", () => {
  it("moves it to the current round's date", () => {
    const stale = {
      exam: "EST1",
      location: "قاعة 1",
      groupUrl: "https://chat.whatsapp.com/abc",
      examDate: OCT_9,
    };
    expect(syncAutoExamDate(stale, "2026-10-11").examDate).toBe(DEC_11);
    expect(syncAutoExamDate(stale, "2026-10-01").examDate).toBe(OCT_9);
  });

  it("leaves a date the user typed themselves alone", () => {
    const custom = {
      exam: "EST1",
      location: "قاعة 1",
      groupUrl: "https://chat.whatsapp.com/abc",
      examDate: "بعد صلاة الجمعة",
    };
    expect(syncAutoExamDate(custom, "2026-10-11")).toBe(custom);
  });

  it("leaves a custom exam's date alone", () => {
    const custom = {
      exam: "فيزياء 101",
      location: "قاعة 1",
      groupUrl: "https://chat.whatsapp.com/abc",
      examDate: OCT_9,
    };
    expect(syncAutoExamDate(custom, "2026-10-11")).toBe(custom);
  });

  it("rewrites the saved message and keeps its style", () => {
    const stale = buildMessageTemplate(
      {
        exam: "EST2",
        location: "قاعة 1",
        groupUrl: "https://chat.whatsapp.com/abc",
        examDate: OCT_10,
      },
      "friendly",
    );
    const synced = syncAutoExamDateTemplate(stale, "2026-10-11");
    expect(synced).toContain("تشرفنا بوجودك معنا");
    expect(parseMessageTemplate(synced).examDate).toBe(DEC_12);
    expect(syncAutoExamDateTemplate(stale, "2026-10-01")).toBe(stale);
  });
});
