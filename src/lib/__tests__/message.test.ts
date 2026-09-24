import { describe, expect, it } from "vitest";
import {
  buildWhatsAppUrl,
  generateWhatsAppMessage,
  NAME_PLACEHOLDER,
} from "../message";

const TEMPLATE = `أهلاً ${NAME_PLACEHOLDER}

ده الجروب الخاص بامتحان تجريبي.
\n📌 رابط تجريبي: https://example.com/demo-invite
🕘 موعد الامتحان: يوم الجمعة`;

describe("generateWhatsAppMessage", () => {
  it("replaces the {name} placeholder", () => {
    const out = generateWhatsAppMessage("مراقب تجريبي", TEMPLATE);
    expect(out).toContain("أهلاً مراقب تجريبي");
    expect(out).not.toContain("{name}");
  });

  it("replaces every occurrence of the placeholder", () => {
    const t = "مرحبًا {name}! حضور {name} مطلوب.";
    expect(generateWhatsAppMessage("مراقب تجريبي", t)).toBe(
      "مرحبًا مراقب تجريبي! حضور مراقب تجريبي مطلوب.",
    );
  });

  it("returns the template verbatim when there is no placeholder", () => {
    expect(generateWhatsAppMessage("x", "أهلا بالجميع")).toBe("أهلا بالجميع");
  });

  it("trims only the injected name, not the template", () => {
    expect(generateWhatsAppMessage("  مراقب تجريبي  ", "أهلاً {name}")).toBe(
      "أهلاً مراقب تجريبي",
    );
  });
});

describe("buildWhatsAppUrl", () => {
  const phone = "201000000001";
  const t = `مرحبًا ${NAME_PLACEHOLDER} وسلام عليك`;

  it("uses wa.me on mobile", () => {
    const url = buildWhatsAppUrl("مراقب تجريبي", phone, t, true);
    expect(url.startsWith("https://wa.me/201000000001?text=")).toBe(true);
  });

  it("uses web.whatsapp.com/send on desktop", () => {
    const url = buildWhatsAppUrl("مراقب تجريبي", phone, t, false);
    expect(
      url.startsWith("https://web.whatsapp.com/send?phone=201000000001&text="),
    ).toBe(true);
  });

  it("encodes the message so Arabic and line breaks survive", () => {
    const url = buildWhatsAppUrl("مراقب تجريبي", phone, TEMPLATE, true);
    const textArg = url.split("?text=")[1];
    expect(decodeURIComponent(textArg)).toBe(
      generateWhatsAppMessage("مراقب تجريبي", TEMPLATE),
    );
    expect(textArg).toContain("%0A");
  });

  it("strips non-digits from the phone in the URL", () => {
    const url = buildWhatsAppUrl("x", "+20 (100) 000-0001", "hello {name}", true);
    expect(url).toContain("wa.me/201000000001?");
  });
});
