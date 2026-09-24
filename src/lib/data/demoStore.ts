import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import seedData from "@/lib/demo-seed.json";
import type { Proctor, ProctorList, Profile } from "@/lib/types";

/**
 * Zero-config local demo persistence: a single JSON file under ./data.
 * It is intentionally not used in production; set DATA_PROVIDER=supabase.
 * The location is detected at runtime so API routes and server-rendered pages
 * agree on the same file during local development.
 */

export interface DemoDB {
  users: Profile[];
  lists: ProctorList[];
  proctors: Proctor[];
}

let DB_FILE: string | null = null;

function dbFile(): string {
  if (DB_FILE) return DB_FILE;
  const local = path.join(process.cwd(), "data", "db.json");
  if (fs.existsSync(local)) {
    DB_FILE = local;
    return local;
  }
  try {
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, "");
    fs.unlinkSync(local);
    DB_FILE = local;
  } catch {
    DB_FILE = path.join(os.tmpdir(), "proctor-whatsapp-db.json");
  }
  return DB_FILE;
}

let cache: DemoDB | null = null;

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function loadDb(): DemoDB {
  if (cache) return cache;
  const file = dbFile();
  if (fs.existsSync(file)) {
    try {
      cache = JSON.parse(fs.readFileSync(file, "utf8")) as DemoDB;
    } catch {
      cache = null;
    }
  }
  if (!cache) {
    cache = JSON.parse(JSON.stringify(seedData)) as DemoDB;
    saveDb();
  }
  return cache;
}

export function saveDb(): void {
  if (!cache) throw new Error("Demo DB not loaded");
  fs.mkdirSync(path.dirname(dbFile()), { recursive: true });
  fs.writeFileSync(dbFile(), JSON.stringify(cache, null, 2), "utf8");
}

export function upsertUser(email: string, displayName?: string): Profile {
  const db = loadDb();
  const id = hashEmail(email);
  let user = db.users.find((u) => u.id === id);
  if (!user) {
    user = {
      id,
      email: email.trim().toLowerCase(),
      display_name: displayName?.trim() || email.split("@")[0],
      default_country_code: "20",
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    saveDb();
  }
  return user;
}

export function listOf(userId: string): ProctorList[] {
  return loadDb()
    .lists.filter((l) => l.owner_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getList(userId: string, listId: string): ProctorList | null {
  const l = loadDb().lists.find((x) => x.id === listId && x.owner_id === userId);
  return l ?? null;
}

export function createList(
  userId: string,
  data: { title: string; message_template: string; default_country_code: string },
): ProctorList {
  const db = loadDb();
  const now = new Date().toISOString();
  const list: ProctorList = {
    id: genId(),
    owner_id: userId,
    title: data.title.trim() || "قائمة جديدة",
    message_template: data.message_template,
    default_country_code: data.default_country_code || "20",
    created_at: now,
    updated_at: now,
  };
  db.lists.push(list);
  saveDb();
  return list;
}

export function updateList(
  userId: string,
  listId: string,
  data: Partial<Pick<ProctorList, "title" | "message_template" | "default_country_code">>,
): ProctorList | null {
  const db = loadDb();
  const list = db.lists.find((x) => x.id === listId && x.owner_id === userId);
  if (!list) return null;
  if (typeof data.title === "string") list.title = data.title.trim();
  if (typeof data.message_template === "string")
    list.message_template = data.message_template;
  if (typeof data.default_country_code === "string")
    list.default_country_code = data.default_country_code;
  list.updated_at = new Date().toISOString();
  saveDb();
  return list;
}

export function deleteList(userId: string, listId: string): boolean {
  const db = loadDb();
  const i = db.lists.findIndex((x) => x.id === listId && x.owner_id === userId);
  if (i === -1) return false;
  db.lists.splice(i, 1);
  db.proctors = db.proctors.filter((p) => p.list_id !== listId);
  saveDb();
  return true;
}

export function proctorsOf(userId: string, listId: string): Proctor[] {
  const list = getList(userId, listId);
  if (!list) return [];
  return loadDb()
    .proctors.filter((p) => p.list_id === listId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

export function getProctor(
  userId: string,
  proctorId: string,
): Proctor | null {
  const p = loadDb().proctors.find(
    (x) => x.id === proctorId && x.list_id && getList(userId, x.list_id),
  );
  return p ?? null;
}

export function bulkCreateProctors(
  userId: string,
  listId: string,
  rows: { name: string; phone: string }[],
): number {
  const list = getList(userId, listId);
  if (!list) return 0;
  const db = loadDb();
  const now = new Date().toISOString();
  const maxOrder =
    db.proctors
      .filter((p) => p.list_id === listId)
      .reduce((m, p) => Math.max(m, p.sort_order), 0) + 1;
  rows.forEach((r, i) => {
    db.proctors.push({
      id: genId(),
      list_id: listId,
      name: r.name.trim(),
      phone: r.phone,
      opened_at: null,
      opened_count: 0,
      sort_order: maxOrder + i,
      created_at: now,
    });
  });
  saveDb();
  return rows.length;
}

export function updateProctor(
  userId: string,
  proctorId: string,
  patch: { name?: string; phone?: string },
): Proctor | null {
  const db = loadDb();
  const p = db.proctors.find(
    (x) => x.id === proctorId && getList(userId, x.list_id),
  );
  if (!p) return null;
  if (typeof patch.name === "string") p.name = patch.name.trim();
  if (typeof patch.phone === "string") p.phone = patch.phone;
  saveDb();
  return p;
}

export function deleteProctor(userId: string, proctorId: string): boolean {
  const db = loadDb();
  const p = db.proctors.find(
    (x) => x.id === proctorId && getList(userId, x.list_id),
  );
  if (!p) return false;
  db.proctors = db.proctors.filter((x) => x.id !== proctorId);
  saveDb();
  return true;
}

export function markOpened(userId: string, proctorId: string): Proctor | null {
  const db = loadDb();
  const p = db.proctors.find(
    (x) => x.id === proctorId && getList(userId, x.list_id),
  );
  if (!p) return null;
  p.opened_at = new Date().toISOString();
  p.opened_count += 1;
  saveDb();
  return p;
}

export function resetListOpened(userId: string, listId: string): boolean {
  const list = getList(userId, listId);
  if (!list) return false;
  const db = loadDb();
  db.proctors.forEach((p) => {
    if (p.list_id === listId) {
      p.opened_at = null;
      p.opened_count = 0;
    }
  });
  saveDb();
  return true;
}

export function genId(): string {
  return "x" + createHash("sha256").update(Date.now() + Math.random().toString()).digest("hex").slice(0, 16);
}