import { get, put } from "@vercel/blob";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { isAdminEmail } from "@/lib/env";
import seedData from "@/lib/demo-seed.json";
import type {
  AdminListRow,
  AdminOverview,
  AdminUserRow,
  Proctor,
  ProctorList,
  Profile,
  UserRole,
} from "@/lib/types";

/**
 * Local demo persistence. On Vercel, when a private Blob store is connected,
 * the same demo database is persisted there instead of the ephemeral /tmp
 * filesystem. Supabase remains the recommended production provider.
 */

export interface DemoDB {
  users: Profile[];
  lists: ProctorList[];
  proctors: Proctor[];
}

const BLOB_PATH = "proctor-whatsapp/demo-db.json";
let DB_FILE: string | null = null;
let localCache: DemoDB | null = null;

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

function usesBlobStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function cloneSeed(): DemoDB {
  return JSON.parse(JSON.stringify(seedData)) as DemoDB;
}

async function readBlobDb(): Promise<DemoDB | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const result = await get(BLOB_PATH, {
    access: "private",
    token,
    useCache: false,
  });
  if (!result?.stream) return null;
  return JSON.parse(await new Response(result.stream).text()) as DemoDB;
}

async function writeBlobDb(db: DemoDB): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  await put(BLOB_PATH, JSON.stringify(db), {
    access: "private",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function loadDb(): Promise<DemoDB> {
  if (usesBlobStore()) {
    try {
      const remote = await readBlobDb();
      if (remote) return migrateDb(remote);
      const seeded = cloneSeed();
      await writeBlobDb(seeded);
      return seeded;
    } catch (error) {
      console.error("[demo-store] blob read/write failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  if (localCache) return localCache;
  const file = dbFile();
  if (fs.existsSync(file)) {
    try {
      localCache = JSON.parse(fs.readFileSync(file, "utf8")) as DemoDB;
    } catch {
      localCache = null;
    }
  }
  if (!localCache) {
    localCache = cloneSeed();
    await saveDb(localCache);
  }
  return migrateDb(localCache);
}

/** Older stores predate roles: default every legacy row to a plain user. */
function migrateDb(db: DemoDB): DemoDB {
  let changed = false;
  db.users = (db.users ?? []).map((user) => {
    if (user.role === "admin" || user.role === "supervisor" || user.role === "user")
      return user;
    changed = true;
    return { ...user, role: "user" as const };
  });
  if (changed) void saveDb(db);
  return db;
}

export async function saveDb(db: DemoDB): Promise<void> {
  if (usesBlobStore()) {
    await writeBlobDb(db);
    return;
  }
  localCache = db;
  fs.mkdirSync(path.dirname(dbFile()), { recursive: true });
  fs.writeFileSync(dbFile(), JSON.stringify(db, null, 2), "utf8");
}

export async function upsertUser(
  email: string,
  displayName?: string,
): Promise<Profile> {
  const db = await loadDb();
  const id = hashEmail(email);
  let user = db.users.find((u) => u.id === id);
  if (!user) {
    user = {
      id,
      email: email.trim().toLowerCase(),
      display_name: displayName?.trim() || "مستخدم",
      role: isAdminEmail(email) ? "admin" : "user",
      default_country_code: "20",
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    await saveDb(db);
  }
  return user;
}

/* -------------------------------- admin ------------------------------- */

/** Aggregate counters plus one row per user and per list. */
export async function adminOverview(): Promise<AdminOverview> {
  const db = await loadDb();
  const listsByOwner = (ownerId: string) =>
    db.lists.filter((l) => l.owner_id === ownerId);

  const users: AdminUserRow[] = db.users.map((user) => {
    const lists = listsByOwner(user.id);
    const ids = new Set(lists.map((l) => l.id));
    const proctors = db.proctors.filter((p) => ids.has(p.list_id));
    return {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: isAdminEmail(user.email) ? "admin" : user.role,
      created_at: user.created_at,
      listCount: lists.length,
      proctorCount: proctors.length,
      openedCount: proctors.filter((p) => p.opened_at).length,
    };
  });

  const lists: AdminListRow[] = db.lists.map((list) => {
    const owner = db.users.find((u) => u.id === list.owner_id);
    const proctors = db.proctors.filter((p) => p.list_id === list.id);
    return {
      id: list.id,
      title: list.title,
      owner_id: list.owner_id,
      owner_name: owner?.display_name || owner?.email || "مستخدم",
      owner_email: owner?.email ?? "",
      proctorCount: proctors.length,
      openedCount: proctors.filter((p) => p.opened_at).length,
      created_at: list.created_at,
    };
  });

  return {
    stats: {
      users: users.length,
      lists: lists.length,
      proctors: db.proctors.length,
      opened: db.proctors.filter((p) => p.opened_at).length,
    },
    users: users.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    lists: lists.sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

/** Updates a role. Admin allow-list emails can never be demoted. */
export async function setUserRole(userId: string, role: UserRole): Promise<boolean> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user || isAdminEmail(user.email)) return false;
  user.role = role;
  await saveDb(db);
  return true;
}

export async function listOf(userId: string): Promise<ProctorList[]> {
  const db = await loadDb();
  return db.lists
    .filter((l) => l.owner_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getList(
  userId: string,
  listId: string,
): Promise<ProctorList | null> {
  const db = await loadDb();
  return db.lists.find((x) => x.id === listId && x.owner_id === userId) ?? null;
}

export async function createList(
  userId: string,
  data: { title: string; message_template: string; default_country_code: string },
): Promise<ProctorList> {
  const db = await loadDb();
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
  await saveDb(db);
  return list;
}

export async function updateList(
  userId: string,
  listId: string,
  data: Partial<Pick<ProctorList, "title" | "message_template" | "default_country_code">>,
): Promise<ProctorList | null> {
  const db = await loadDb();
  const list = db.lists.find((x) => x.id === listId && x.owner_id === userId);
  if (!list) return null;
  if (typeof data.title === "string") list.title = data.title.trim();
  if (typeof data.message_template === "string") {
    list.message_template = data.message_template;
  }
  if (typeof data.default_country_code === "string") {
    list.default_country_code = data.default_country_code;
  }
  list.updated_at = new Date().toISOString();
  await saveDb(db);
  return list;
}

export async function deleteList(userId: string, listId: string): Promise<boolean> {
  const db = await loadDb();
  const index = db.lists.findIndex((x) => x.id === listId && x.owner_id === userId);
  if (index === -1) return false;
  db.lists.splice(index, 1);
  db.proctors = db.proctors.filter((p) => p.list_id !== listId);
  await saveDb(db);
  return true;
}

export async function proctorsOf(
  userId: string,
  listId: string,
): Promise<Proctor[]> {
  const db = await loadDb();
  const list = db.lists.find((x) => x.id === listId && x.owner_id === userId);
  if (!list) return [];
  return db.proctors
    .filter((p) => p.list_id === listId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

export async function getProctor(
  userId: string,
  proctorId: string,
): Promise<Proctor | null> {
  const db = await loadDb();
  const p = db.proctors.find(
    (x) => x.id === proctorId && db.lists.some((l) => l.id === x.list_id && l.owner_id === userId),
  );
  return p ?? null;
}

export async function bulkCreateProctors(
  userId: string,
  listId: string,
  rows: { name: string; phone: string }[],
): Promise<number> {
  const db = await loadDb();
  const list = db.lists.find((x) => x.id === listId && x.owner_id === userId);
  if (!list) return 0;
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
  await saveDb(db);
  return rows.length;
}

export async function updateProctor(
  userId: string,
  proctorId: string,
  patch: { name?: string; phone?: string },
): Promise<Proctor | null> {
  const db = await loadDb();
  const p = db.proctors.find(
    (x) => x.id === proctorId && db.lists.some((l) => l.id === x.list_id && l.owner_id === userId),
  );
  if (!p) return null;
  if (typeof patch.name === "string") p.name = patch.name.trim();
  if (typeof patch.phone === "string") p.phone = patch.phone;
  await saveDb(db);
  return p;
}

export async function deleteProctor(
  userId: string,
  proctorId: string,
): Promise<boolean> {
  const db = await loadDb();
  const index = db.proctors.findIndex(
    (x) => x.id === proctorId && db.lists.some((l) => l.id === x.list_id && l.owner_id === userId),
  );
  if (index === -1) return false;
  db.proctors.splice(index, 1);
  await saveDb(db);
  return true;
}

export async function markOpened(
  userId: string,
  proctorId: string,
): Promise<Proctor | null> {
  const db = await loadDb();
  const p = db.proctors.find(
    (x) => x.id === proctorId && db.lists.some((l) => l.id === x.list_id && l.owner_id === userId),
  );
  if (!p) return null;
  p.opened_at = new Date().toISOString();
  p.opened_count += 1;
  await saveDb(db);
  return p;
}

export async function resetListOpened(
  userId: string,
  listId: string,
): Promise<boolean> {
  const db = await loadDb();
  const list = db.lists.find((x) => x.id === listId && x.owner_id === userId);
  if (!list) return false;
  db.proctors.forEach((p) => {
    if (p.list_id === listId) {
      p.opened_at = null;
      p.opened_count = 0;
    }
  });
  await saveDb(db);
  return true;
}

export function genId(): string {
  return "x" + createHash("sha256").update(Date.now() + Math.random().toString()).digest("hex").slice(0, 16);
}
