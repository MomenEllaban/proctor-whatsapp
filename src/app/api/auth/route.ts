import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { demoLogout, getSessionUser } from "@/lib/data";
import { isDemo } from "@/lib/env";

export async function POST() {
  if (isDemo) {
    await demoLogout();
  } else {
    const supabase = createServerSupabase();
    await supabase.auth.signOut();
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user });
}