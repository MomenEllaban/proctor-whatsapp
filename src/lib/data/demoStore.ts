import { get, put } from "@vercel/blob";
import { createHash, randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import seedData from "@/lib/demo-seed.json";
import type {
  Proctor,
  ProctorList,
  Profile,
  ShareState,
  SharedList,
  SharedProctor,
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
  /** Bump whenever demo-seed.json changes so stale stores self-heal. */
  seed_version?: number;
}

const BLOB_PATH = "proctor-whatsapp/demo-db.json";
/** Must match the value written by scripts/seed-demo.mjs. */
const SEED_VERSION = 2;
let DB_FILE: string | null = null;
let localCache: DemoDB | null = null;
/** Identity of the file localCache was built from; see readLocalDb(). */
let localCacheStamp = "";

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
  return normalizeShareFields({
    ...(JSON.parse(JSON.stringify(seedData)) as DemoDB),
    seed_version: SEED_VERSION,
  });
}

/** 96 bits of randomness, same shape as the Postgres default. */
export function genShareToken(): string {
  return randomBytes(12).toString("hex");
}

/**
 * Seeded lists predate the share columns, so fill them in on read rather than
 * forcing a seed-version bump (which would throw away existing demo accounts).
 */
function normalizeShareFields(db: DemoDB): DemoDB {
  const taken = new Set<string>();
  for (const list of db.lists) {
    if (typeof list.share_token !== "string" || !list.share_token) {
      let token = genShareToken();
      while (taken.has(token)) token = genShareToken();
      list.share_token = token;
    }
    if (typeof list.share_enabled !== "boolean") {
      list.share_enabled = false;
    }
    taken.add(list.share_token);
  }
  return db;
}

/** Stale stores (older deploys, old blob) are replaced by the current seed. */
function isCurrentSeed(db: DemoDB | null | undefined): boolean {
  return Boolean(db && db.seed_version === SEED_VERSION);
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

/**
 * Next bundles each route separately, so `localCache` here is per bundle, not
 * per process: the share page and the API routes that write to the demo db do
 * not share it. Re-reading whenever the file on disk changes keeps them in
 * step — without it a visitor would be served a stale (or wrongly disabled)
 * share link after the owner toggled it.
 */
function readLocalDb(file: string): DemoDB | null {
  let stamp: string;
  try {
    const stat = fs.statSync(file);
    stamp = `${stat.mtimeMs}:${stat.size}`;
  } catch {
    return null;
  }
  if (localCache && stamp === localCacheStamp) return localCache;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as DemoDB;
    if (!isCurrentSeed(parsed)) {
      console.info("[demo-store] stale local demo db detected; reseeding with current data");
      localCache = null;
      localCacheStamp = "";
      return null;
    }
    localCache = parsed;
    localCacheStamp = stamp;
    return parsed;
  } catch {
    localCache = null;
    localCacheStamp = "";
    return null;
  }
}

export async function loadDb(): Promise<DemoDB> {
  if (usesBlobStore()) {
    try {
      const remote = await readBlobDb();
      if (isCurrentSeed(remote)) {
        const db = remote as DemoDB;
        const needsSave = hasMissingShareFields(db);
        normalizeShareFields(db);
        if (needsSave) await writeBlobDb(db);
        return db;
      }
      if (remote) {
        console.info("[demo-store] stale demo db detected; reseeding with current data");
      }
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

  const existing = readLocalDb(dbFile());
  if (existing) {
    if (hasMissingShareFields(existing)) {
      normalizeShareFields(existing);
      await saveDb(existing);
    }
    return existing;
  }
  localCache = cloneSeed();
  await saveDb(localCache);
  return localCache;
}

function hasMissingShareFields(db: DemoDB): boolean {
  return db.lists.some(
    (l) =>
      typeof l.share_token !== "string" ||
      !l.share_token ||
      typeof l.share_enabled !== "boolean",
  );
}

export async function saveDb(db: DemoDB): Promise<void> {
  if (usesBlobStore()) {
    await writeBlobDb(db);
    return;
  }
  localCache = db;
  fs.mkdirSync(path.dirname(dbFile()), { recursive: true });
  fs.writeFileSync(dbFile(), JSON.stringify(db, null, 2), "utf8");
  try {
    const stat = fs.statSync(dbFile());
    localCacheStamp = `${stat.mtimeMs}:${stat.size}`;
  } catch {
    localCacheStamp = "";
  }
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
      default_country_code: "20",
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    await saveDb(db);
  }
  return user;
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
    share_token: genShareToken(),
    share_enabled: false,
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

/* -------------------------------- share -------------------------------- */

export async function getShare(
  userId: string,
  listId: string,
): Promise<ShareState | null> {
  const db = await loadDb();
  const list = db.lists.find((x) => x.id === listId && x.owner_id === userId);
  if (!list) return null;
  normalizeShareFields(db);
  return { share_token: list.share_token, share_enabled: list.share_enabled };
}

export async function setShareEnabled(
  userId: string,
  listId: string,
  enabled: boolean,
): Promise<ShareState | null> {
  const db = await loadDb();
  const list = db.lists.find((x) => x.id === listId && x.owner_id === userId);
  if (!list) return null;
  if (!list.share_token) list.share_token = genShareToken();
  list.share_enabled = enabled;
  list.updated_at = new Date().toISOString();
  await saveDb(db);
  return { share_token: list.share_token, share_enabled: list.share_enabled };
}

export async function rotateShareToken(
  userId: string,
  listId: string,
): Promise<string | null> {
  const db = await loadDb();
  const list = db.lists.find((x) => x.id === listId && x.owner_id === userId);
  if (!list) return null;
  let token = genShareToken();
  while (db.lists.some((x) => x.id !== listId && x.share_token === token)) {
    token = genShareToken();
  }
  list.share_token = token;
  list.updated_at = new Date().toISOString();
  await saveDb(db);
  return token;
}

/** Mirrors get_shared_list + get_shared_proctors: enabled token only. */
export async function getSharedByToken(
  token: string,
): Promise<{ list: SharedList; proctors: SharedProctor[] } | null> {
  const db = await loadDb();
  const list = db.lists.find((x) => x.share_token === token && x.share_enabled);
  if (!list) return null;
  const proctors = db.proctors
    .filter((p) => p.list_id === list.id)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    .map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      opened_at: p.opened_at,
    }));
  return {
    list: {
      id: list.id,
      title: list.title,
      message_template: list.message_template,
    },
    proctors,
  };
}

/** Mirrors record_shared_open: the proctor must belong to the token's list. */
export async function markSharedOpened(
  token: string,
  proctorId: string,
): Promise<boolean> {
  const db = await loadDb();
  const list = db.lists.find((x) => x.share_token === token && x.share_enabled);
  if (!list) return false;
  const proctor = db.proctors.find(
    (p) => p.id === proctorId && p.list_id === list.id,
  );
  if (!proctor) return false;
  proctor.opened_at = new Date().toISOString();
  proctor.opened_count += 1;
  await saveDb(db);
  return true;
}
