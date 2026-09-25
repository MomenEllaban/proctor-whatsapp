import { describe, expect, it } from "vitest";
import {
  buildMessageTemplate,
  DEFAULT_MESSAGE_TEMPLATE,
  DEFAULT_MESSAGE_VARIABLES,
  isValidMessageTemplate,
  parseMessageTemplate,
  validateMessageVariables,
} from "../message";

describe("default message template", () => {
  it("is a complete ready-to-send message, not a blank template", () => {
    expect(DEFAULT_MESSAGE_TEMPLATE).toBe(
      [
        "السلام عليكم ورحمة الله وبركاته، أهلاً {name}",
        "ده الجروب الخاص بامتحان EST1",
        "المكان: Horus University - Faculty of Engineering",
        "📌 رابط الجروب: https://chat.whatsapp.com/L7UDY5953nJ8Z6CU3o9jZ4",
        "🗓 موعد الامتحان: يوم الجمعة الموافق 9 أكتوبر 2026",
        "🔔 يرجى تأكيد الحضور بكتابة الاسم الثنائي داخل الجروب.",
        "مع تمنياتنا بالتوفيق، وكل سنة وأنتم طيبين 🌷",
      ].join("\n\n"),
    );
    expect(DEFAULT_MESSAGE_TEMPLATE).toContain("{name}");
    expect(isValidMessageTemplate(DEFAULT_MESSAGE_TEMPLATE)).toBe(true);
  });

  it("round-trips through the structured variables", () => {
    expect(parseMessageTemplate(DEFAULT_MESSAGE_TEMPLATE)).toEqual(
      DEFAULT_MESSAGE_VARIABLES,
    );
  });

  it("keeps the fixed sentences when one variable changes", () => {
    const next = buildMessageTemplate({
      ...DEFAULT_MESSAGE_VARIABLES,
      exam: "EST2",
      examDate: "يوم السبت الموافق 10 أكتوبر 2026",
    });
    expect(next).toContain("ده الجروب الخاص بامتحان EST2");
    expect(next).toContain("🗓 موعد الامتحان: يوم السبت الموافق 10 أكتوبر 2026");
    expect(next).toContain("🔔 يرجى تأكيد الحضور بكتابة الاسم الثنائي داخل الجروب.");
    expect(parseMessageTemplate(next).exam).toBe("EST2");
  });

  it("normalizes EST2 variants and legacy university suffixes", () => {
    const legacy = DEFAULT_MESSAGE_TEMPLATE.replace(
      "ده الجروب الخاص بامتحان EST1",
      "ده الجروب الخاص بامتحان est 2 - Horus University.",
    );
    expect(parseMessageTemplate(legacy).exam).toBe("EST2");
  });

  it("reports missing values and a malformed group link", () => {
    const errors = validateMessageVariables({
      exam: "",
      location: " ",
      groupUrl: "chat.whatsapp.com/no-scheme",
      examDate: "",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "exam",
      "examDate",
      "groupUrl",
      "location",
    ]);
    expect(isValidMessageTemplate(DEFAULT_MESSAGE_TEMPLATE)).toBe(true);
  });
});
