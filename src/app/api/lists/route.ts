import { NextResponse } from "next/server";
import {
  createList,
  listLists,
  getOptionalCurrentUser,
} from "@/lib/data";

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
  const list = await createList(user, {
    title: String(title).slice(0, 120),
    message_template: String(message_template ?? "")
      .slice(0, 4000)
      .replace(/\r\n/g, "\n"),
    default_country_code: String(default_country_code || "20").slice(0, 5),
  });
  return NextResponse.json({ list });
}