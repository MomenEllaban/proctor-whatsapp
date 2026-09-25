/* Seeds the demo database (./data/db.json) with fictional accounts only.
   No real names, phone numbers, institutions, or invite links are stored:
   users are "مستخدم 1..8" on example.com and every phone is a placeholder.

   All 8 demo accounts sign in with DEMO_PASSWORD (default: demo1234). */
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

const hash = (s) => createHash("sha256").update(s).digest("hex");
const idOf = (email) => hash(email.trim().toLowerCase());
const now = new Date().toISOString();

/* Fictional accounts only — no real people, no specific organisation. */
const EXAMS = [
  { exam: "EST1", date: "يوم الجمعة الموافق 9 أكتوبر 2026" },
  { exam: "EST2", date: "يوم السبت الموافق 10 أكتوبر 2026" },
  { exam: "الدور الأول", date: "يوم الأحد الموافق 11 أكتوبر 2026" },
  { exam: "الدور الثاني", date: "يوم الثلاثاء الموافق 13 أكتوبر 2026" },
  { exam: "الامتحان التجريبي", date: "يوم الأربعاء الموافق 14 أكتوبر 2026" },
  { exam: "مراجعة نهائية", date: "يوم الخميس الموافق 15 أكتوبر 2026" },
  { exam: "امتحان الجزء الثاني", date: "يوم السبت الموافق 17 أكتوبر 2026" },
  { exam: "امتحان ختامي", date: "يوم الأحد الموافق 18 أكتوبر 2026" },
];

const LOCATION = "قاعة الامتحانات الرئيسية";
/* Reserved example domain: never a real WhatsApp invite link. */
const INVITE = "https://example.com/demo-invite";

/** Same canonical structure the app builds, with fake variable values. */
const messageFor = ({ exam, date }) =>
  [
    "السلام عليكم ورحمة الله وبركاته، أهلاً {name}",
    `ده الجروب الخاص بامتحان ${exam}`,
    `المكان: ${LOCATION}`,
    `📌 رابط الجروب: ${INVITE}`,
    `🗓 موعد الامتحان: ${date}`,
    "🔔 يرجى تأكيد الحضور بكتابة الاسم الثنائي داخل الجروب.",
    "مع تمنياتنا بالتوفيق، وكل سنة وأنتم طيبين 🌷",
  ].join("\n\n");

const users = [];
const lists = [];
const proctors = [];

EXAMS.forEach((entry, index) => {
  const email = `user${index + 1}@example.com`;
  const uid = idOf(email);
  const count = 3 + (index % 6);

  users.push({
    id: uid,
    email,
    display_name: `مستخدم ${index + 1}`,
    default_country_code: "20",
    created_at: now,
  });

  const listId = "ls-" + hash(uid).slice(0, 12);
  lists.push({
    id: listId,
    owner_id: uid,
    title: `قائمة تجريبية ${index + 1} — ${entry.exam}`,
    message_template: messageFor(entry),
    default_country_code: "20",
    created_at: now,
    updated_at: now,
  });

  for (let i = 0; i < count; i++) {
    const phone = "2010000" + String(index * 10 + i + 1).padStart(4, "0");
    const opened = i % 3 === 0;
    proctors.push({
      id: "pr-" + hash(listId + phone).slice(0, 14),
      list_id: listId,
      name: `مراقب ${i + 1}`,
      phone,
      opened_at: opened ? now : null,
      opened_count: opened ? 1 + (i % 4) : 0,
      sort_order: i + 1,
      created_at: now,
    });
  }
});

const DB = { users, lists, proctors };

const dir = path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "db.json"), JSON.stringify(DB, null, 2), "utf8");

// Committed copy used to auto-seed the demo on serverless hosts (Vercel),
// where the project dir is read-only and ./data is not persisted.
fs.writeFileSync(
  path.join(process.cwd(), "src", "lib", "demo-seed.json"),
  JSON.stringify(DB, null, 2),
  "utf8",
);

console.log(
  `Seeded demo DB: ${users.length} users, ${lists.length} lists, ${proctors.length} proctors.`,
);
console.log(`Quick login: ${users.map((u) => u.email).join(", ")}`);
console.log("All demo accounts share DEMO_PASSWORD (default: demo1234)");
