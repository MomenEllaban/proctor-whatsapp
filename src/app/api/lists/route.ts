import { NextResponse } from "next/server";
import {
  createList,
  getList,
  listLists,
  getOptionalCurrentUser,
} from "@/lib/data";
import { isDemo } from "@/lib/env";
import { DEFAULT_MESSAGE_TEMPLATE } from "@/lib/message";

export async function GET() {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const lists = await listLists(user);
  return NextResponse.json({ lists });
}

export async function POST(req: Request) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { title, message_template, default_country_code } = await req
    .json()
    .catch(() => ({}));
  if (!title?.trim()) {
    return NextResponse.json({ error: "اكتب اسم القائمة" }, { status: 400 });
  }
  const rawTemplate =
    typeof message_template === "string" ? message_template : "";
  const list = await createList(user, {
    title: String(title).slice(0, 120),
    message_template: (rawTemplate.trim() ? rawTemplate : DEFAULT_MESSAGE_TEMPLATE)
      .slice(0, 4000)
      .replace(/\r\n/g, "\n"),
    default_country_code: String(default_country_code || "20").slice(0, 5),
  });
  const persisted = await getList(user, list.id);
  if (!persisted || persisted.id !== list.id) {
    console.error("[create-list] persistence verification failed", {
      listId: list.id,
      provider: isDemo ? "demo" : "supabase",
    });
    return NextResponse.json(
      { error: "تم إنشاء القائمة لكن تعذر تأكيد حفظها. حاول مرة أخرى." },
      { status: 503 },
    );
  }
  console.info("[create-list] persisted", {
    listId: persisted.id,
    provider: isDemo ? "demo" : "supabase",
  });
  return NextResponse.json({ list: persisted }, { status: 201 });
}