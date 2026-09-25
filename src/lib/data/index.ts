import { cookies } from "next/headers";
import { userClient } from "@/lib/supabase/server";
import { env, isDemo } from "@/lib/env";
import type { Proctor, ProctorList } from "@/lib/types";
import * as demo from "./demoStore";

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string | null;
  defaultCountryCode: string;
}

const DEMO_COOKIE = "demo_uid";

/* ------------------------------- session ------------------------------- */

export async function getSessionUser(): Promise<CurrentUser | null> {
  if (isDemo) {
    const store = await cookies();
    const uid = store.get(DEMO_COOKIE)?.value;
    if (!uid) return null;
    const profile = (await demo.loadDb()).users.find((u) => u.id === uid);
    if (!profile) return null;
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      defaultCountryCode: profile.default_country_code,
    };
  }
  const ctx = await userClient();
  if (!ctx) return null;
  const { user } = ctx;
  const { data: profile, error: profileError } = await ctx.supabase
    .from("profiles")
    .select("display_name,default_country_code")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  return {
    id: user.id,
    email: user.email ?? "",
    displayName:
      profile?.display_name ??
      ((user.user_metadata?.display_name as string | undefined) ?? null),
    defaultCountryCode: profile?.default_country_code ?? "20",
  };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Return null only for an unauthenticated request; preserve infrastructure errors. */
export async function getOptionalCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await requireCurrentUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("غير مسموح");
  }
}

/* ------------------------------ profiles ------------------------------ */

export async function getProfileCount(): Promise<number> {
  if (isDemo) return (await demo.loadDb()).users.length;
  const { createClient } = await import("@supabase/supabase-js");
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return 0;
  const admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

/* -------------------------------- lists ------------------------------- */

export async function listLists(user: CurrentUser): Promise<ProctorList[]> {
  if (isDemo) return await demo.listOf(user.id);
  const ctx = await userClient();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from("lists")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProctorList[]) ?? [];
}

export async function getList(
  user: CurrentUser,
  listId: string,
): Promise<ProctorList | null> {
  if (isDemo) return await demo.getList(user.id, listId);
  const ctx = await userClient();
  if (!ctx) return null;
  const { data, error } = await ctx.supabase
    .from("lists")
    .select("*")
    .eq("id", listId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProctorList) ?? null;
}

export async function createList(
  user: CurrentUser,
  data: {
    title: string;
    message_template: string;
    default_country_code: string;
  },
): Promise<ProctorList> {
  if (isDemo) return await demo.createList(user.id, data);
  const ctx = await userClient();
  if (!ctx) throw new UnauthorizedError();
  const { data: row, error } = await ctx.supabase
    .from("lists")
    .insert({
      owner_id: user.id,
      title: data.title,
      message_template: data.message_template,
      default_country_code: data.default_country_code,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row as ProctorList;
}

export async function updateList(
  user: CurrentUser,
  listId: string,
  data: Partial<{
    title: string;
    message_template: string;
    default_country_code: string;
  }>,
): Promise<ProctorList | null> {
  if (isDemo) return await demo.updateList(user.id, listId, data);
  const ctx = await userClient();
  if (!ctx) return null;
  const { data: row, error } = await ctx.supabase
    .from("lists")
    .update(data)
    .eq("id", listId)
    .eq("owner_id", user.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return (row as ProctorList) ?? null;
}

export async function deleteList(
  user: CurrentUser,
  listId: string,
): Promise<boolean> {
  if (isDemo) return await demo.deleteList(user.id, listId);
  const ctx = await userClient();
  if (!ctx) return false;
  const { error } = await ctx.supabase
    .from("lists")
    .delete()
    .eq("id", listId)
    .eq("owner_id", user.id);
  return !error;
}

/* ------------------------------ proctors ------------------------------ */

export async function getProctors(
  user: CurrentUser,
  listId: string,
): Promise<Proctor[]> {
  if (isDemo) return await demo.proctorsOf(user.id, listId);
  const ctx = await userClient();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase
    .from("proctors")
    .select("*")
    .eq("list_id", listId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as Proctor[]) ?? [];
}

export async function getProctor(
  user: CurrentUser,
  proctorId: string,
): Promise<Proctor | null> {
  if (isDemo) {
    // demo.getProctor already checks that the proctor belongs to the user.
    return await demo.getProctor(user.id, proctorId);
  }
  const ctx = await userClient();
  if (!ctx) return null;
  const { data, error } = await ctx.supabase
    .from("proctors")
    .select("*")
    .eq("id", proctorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Proctor) ?? null;
}

export async function bulkAddProctors(
  user: CurrentUser,
  listId: string,
  rows: { name: string; phone: string }[],
): Promise<number> {
  if (isDemo) return await demo.bulkCreateProctors(user.id, listId, rows);
  const ctx = await userClient();
  if (!ctx) throw new UnauthorizedError();
  if (!rows.length) return 0;
  const { data: existing } = await ctx.supabase
    .from("proctors")
    .select("sort_order")
    .eq("list_id", listId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (existing?.sort_order ?? 0) + 1;
  const { error } = await ctx.supabase.from("proctors").insert(
    rows.map((r, i) => ({
      list_id: listId,
      name: r.name,
      phone: r.phone,
      sort_order: nextOrder + i,
    })),
  );
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function updateProctor(
  user: CurrentUser,
  proctorId: string,
  patch: { name?: string; phone?: string },
): Promise<void> {
  if (isDemo) {
    await demo.updateProctor(user.id, proctorId, patch);
    return;
  }
  const ctx = await userClient();
  if (!ctx) throw new UnauthorizedError();
  const { error } = await ctx.supabase
    .from("proctors")
    .update(patch)
    .eq("id", proctorId);
  if (error) throw new Error(error.message);
}

export async function deleteProctor(
  user: CurrentUser,
  proctorId: string,
): Promise<boolean> {
  if (isDemo) return await demo.deleteProctor(user.id, proctorId);
  const ctx = await userClient();
  if (!ctx) return false;
  const { error } = await ctx.supabase.from("proctors").delete().eq("id", proctorId);
  return !error;
}

export async function markProctorOpened(
  user: CurrentUser,
  proctorId: string,
): Promise<void> {
  if (isDemo) {
    await demo.markOpened(user.id, proctorId);
    return;
  }
  const ctx = await userClient();
  if (!ctx) throw new UnauthorizedError();
  const { error } = await ctx.supabase.rpc("increment_proctor_opened", {
    p_proctor_id: proctorId,
  });
  if (error) throw new Error(error.message);
}

export async function resetListOpened(
  user: CurrentUser,
  listId: string,
): Promise<boolean> {
  if (isDemo) return await demo.resetListOpened(user.id, listId);
  const ctx = await userClient();
  if (!ctx) return false;
  const { error } = await ctx.supabase
    .from("proctors")
    .update({ opened_at: null, opened_count: 0 })
    .eq("list_id", listId);
  return !error;
}

/* ----------------------------- auth helpers --------------------------- */

export async function demoLogin(
  email: string,
  password: string,
): Promise<CurrentUser | null> {
  if (!isDemo) return null;
  if (password !== env.demoPassword) return null;
  const profile = await demo.upsertUser(email);
  const store = await cookies();
  store.set(DEMO_COOKIE, profile.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    defaultCountryCode: profile.default_country_code,
  };
}

export async function demoLogout(): Promise<void> {
  const store = await cookies();
  store.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function supabaseSignUp(
  email: string,
  password: string,
): Promise<{ ok: boolean; error: string }> {
  const { createClient } = await import("@supabase/supabase-js");
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return { ok: false, error: "Supabase غير مكوّن" };
  }
  const client = createClient(env.supabaseUrl, env.supabaseAnonKey);
  const { error } = await client.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: "" };
}