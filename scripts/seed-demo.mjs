/* Seeds the demo database (./data/db.json) with 10 demo accounts, each owning
   its own fictional proctor list. Lets multi-user isolation be tested instantly. */
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

// Fictional demo records only — never put real names, phone numbers, or invite links here.
const STUDENTS = [
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

// Message template taken from the prototype (generateWhatsAppMessage), with the
// student name replaced by the {name} variable the app uses per proctor. The
// {course}/{date} placeholders below are substituted AT SEED TIME only, so the
// only runtime variable that reaches a real message is {name}.
const TEMPLATE = `السلام عليكم ورحمة الله وبركاته، أهلاً {name}

ده الجروب الخاص بامتحان {course} - Horus University.

📌 رابط الجروب: https://example.com/demo-invite

🗓 موعد الامتحان: {date}

🔔 يرجى تأكيد الحضور بكتابة الاسم الثنائي داخل الجروب.

مع تمنياتنا بالتوفيق، وكل سنة وأنتم طيبين 🌷`;

const hash = (s) => createHash("sha256").update(s).digest("hex");
const idOf = (email) => hash(email.trim().toLowerCase());
const now = new Date().toISOString();

const EST1_TEMPLATE = TEMPLATE.replace("{course}", "EST1").replace(
  "{date}",
  "يوم الجمعة الموافق 9 أكتوبر 2026",
);
const EST1_LINK = "https://example.com/demo-invite";
const EST1_TEMPLATE_FULL = EST1_TEMPLATE.replace(EST1_LINK, EST1_LINK);

// 10 demo accounts: the main demo user + 9 staff members.
const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@horus.edu.eg";
const ACCOUNTS = [
  { email: DEMO_EMAIL, name: "مستخدم تجريبي", list: "مراقبين امتحان EST1" },
  { email: "manager1@horus.edu.eg", name: "أحمد السيد", list: "مراقبين امتحان فيزياء 101" },
  { email: "manager2@horus.edu.eg", name: "منى خالد", list: "مراقبين امتحان رياضيات 201" },
  { email: "supervisor1@horus.edu.eg", name: "محمد فتحي", list: "مراقبين امتحان كيمياء 2" },
  { email: "supervisor2@horus.edu.eg", name: "سارة إبراهيم", list: "مراقبين امتحان اللغة الإنجليزية" },
  { email: "supervisor3@horus.edu.eg", name: "عمر عبد الرحمن", list: "مراقبين امتحان البرمجة" },
  { email: "staff1@horus.edu.eg", name: "ياسمين محمود", list: "مراقبين امتحان الجرافيك" },
  { email: "staff2@horus.edu.eg", name: "كريم حسن", list: "مراقبين امتحان الميكانيكا" },
  { email: "staff3@horus.edu.eg", name: "رنا عادل", list: "مراقبين امتحان المدني" },
  { email: "staff4@horus.edu.eg", name: "نور الدين سمير", list: "مراقبين امتحان المعمارى" },
];

const COURSES = {
  "مراقبين امتحان فيزياء 101": "فيزياء 101",
  "مراقبين امتحان رياضيات 201": "رياضيات 201",
  "مراقبين امتحان كيمياء 2": "كيمياء 2",
  "مراقبين امتحان اللغة الإنجليزية": "اللغة الإنجليزية",
  "مراقبين امتحان البرمجة": "البرمجة",
  "مراقبين امتحان الجرافيك": "الجرافيك",
  "مراقبين امتحان الميكانيكا": "الميكانيكا",
  "مراقبين امتحان المدني": "الإنشاءات المدنية",
  "مراقبين امتحان المعمارى": "العمارة",
};
const DATES = [
  "الأحد الموافق 4 أكتوبر 2026",
  "الثلاثاء الموافق 6 أكتوبر 2026",
  "الأربعاء الموافق 7 أكتوبر 2026",
  "السبت الموافق 10 أكتوبر 2026",
  "الأحد الموافق 11 أكتوبر 2026",
  "الثلاثاء الموافق 13 أكتوبر 2026",
  "الأربعاء الموافق 14 أكتوبر 2026",
  "السبت الموافق 17 أكتوبر 2026",
  "الأحد الموافق 18 أكتوبر 2026",
];

const users = [];
const lists = [];
const proctors = [];

ACCOUNTS.forEach((acc, aIdx) => {
  const uid = idOf(acc.email);
  users.push({
    id: uid,
    email: acc.email.toLowerCase(),
    display_name: acc.name,
    default_country_code: "20",
    created_at: now,
  });

  const course = COURSES[acc.list];
  const template =
    aIdx === 0
      ? EST1_TEMPLATE_FULL
      : TEMPLATE.replace("{course}", course).replace("{date}", DATES[aIdx - 1]);

  const listId = "ls-" + hash(uid).slice(0, 12);
  lists.push({
    id: listId,
    owner_id: uid,
    title: acc.list,
    message_template: template,
    default_country_code: "20",
    created_at: now,
    updated_at: now,
  });

  // Each list gets 2..6 proctors (main demo list keeps all 17).
  const count = aIdx === 0 ? 17 : 2 + (aIdx % 5);
  const offset = aIdx * 3;
  for (let i = 0; i < count; i++) {
    const s = STUDENTS[(offset + i) % STUDENTS.length];
    const opened = i % 3 === 0;
    proctors.push({
      id: "pr-" + hash(s.name + s.phone + acc.email).slice(0, 14),
      list_id: listId,
      name: s.name,
      phone: s.phone,
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
console.log(`Quick login available for: ${users.map((u) => u.email).join(", ")}`);
console.log(`All demo accounts share the password in DEMO_PASSWORD env (default: demo1234)`);