/* Seeds the demo database (./data/db.json) with fictional accounts only.
   No real names, phone numbers, or invite links are ever stored here:
   users are "مستخدم 1..4" and every phone is a 2010 000 0000 placeholder.

   Accounts (all @horus.edu.eg, roles for the admin panel):
     admin@horus.edu.eg      -> أدمن
     supervisor@horus.edu.eg -> مشرف
     user1@horus.edu.eg      -> مستخدم
     user2@horus.edu.eg      -> مستخدم

   Every demo account signs in with DEMO_PASSWORD (default: demo1234). */
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

const hash = (s) => createHash("sha256").update(s).digest("hex");
const idOf = (email) => hash(email.trim().toLowerCase());
const now = new Date().toISOString();

/* Fictional accounts only — no real people. */
const ACCOUNTS = [
  {
    email: "admin@horus.edu.eg",
    name: "مستخدم 1",
    role: "admin",
    listTitle: "قائمة تجريبية 1 — امتحان EST1",
    exam: "EST1",
    date: "يوم الجمعة الموافق 9 أكتوبر 2026",
    proctors: 12,
  },
  {
    email: "supervisor@horus.edu.eg",
    name: "مستخدم 2",
    role: "supervisor",
    listTitle: "قائمة تجريبية 2 — امتحان EST2",
    exam: "EST2",
    date: "يوم السبت الموافق 10 أكتوبر 2026",
    proctors: 7,
  },
  {
    email: "user1@horus.edu.eg",
    name: "مستخدم 3",
    role: "user",
    listTitle: "قائمة تجريبية 3 — امتحان EST1",
    exam: "EST1",
    date: "يوم الثلاثاء الموافق 13 أكتوبر 2026",
    proctors: 5,
  },
  {
    email: "user2@horus.edu.eg",
    name: "مستخدم 4",
    role: "user",
    listTitle: "قائمة تجريبية 4 — امتحان EST2",
    exam: "EST2",
    date: "يوم الأربعاء الموافق 14 أكتوبر 2026",
    proctors: 3,
  },
];

const LOCATION = "Horus University - Faculty of Engineering";
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

ACCOUNTS.forEach((acc, aIdx) => {
  const uid = idOf(acc.email);
  users.push({
    id: uid,
    email: acc.email,
    display_name: acc.name,
    role: acc.role,
    default_country_code: "20",
    created_at: now,
  });

  const listId = "ls-" + hash(uid).slice(0, 12);
  lists.push({
    id: listId,
    owner_id: uid,
    title: acc.listTitle,
    message_template: messageFor(acc),
    default_country_code: "20",
    created_at: now,
    updated_at: now,
  });

  for (let i = 0; i < acc.proctors; i++) {
    const n = aIdx * 20 + i + 1;
    const phone = "2010000" + String(n).padStart(4, "0");
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
console.log(`Quick login: ${users.map((u) => `${u.email} (${u.role})`).join(", ")}`);
console.log("All demo accounts share DEMO_PASSWORD (default: demo1234)");
