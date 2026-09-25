import { NextResponse } from "next/server";
import {
  deleteList,
  getList,
  getOptionalCurrentUser,
  updateList,
} from "@/lib/data";
import { DEFAULT_MESSAGE_TEMPLATE } from "@/lib/message";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { id } = await params;
  const list = await getList(user, id);
  if (!list) return NextResponse.json({ error: "غير موجودة" }, { status: 404 });
  return NextResponse.json({ list });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, string> = {};
  if (typeof body.title === "string") patch.title = body.title.slice(0, 120);
  if (typeof body.message_template === "string")
    patch.message_template = (
      body.message_template.trim()
        ? body.message_template
        : DEFAULT_MESSAGE_TEMPLATE
    )
      .slice(0, 4000)
      .replace(/\r\n/g, "\n");
  if (typeof body.default_country_code === "string")
    patch.default_country_code = body.default_country_code.slice(0, 5);
  const list = await updateList(user, id, patch);
  if (!list) return NextResponse.json({ error: "غير موجودة" }, { status: 404 });
  return NextResponse.json({ list });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteList(user, id);
  if (!ok) return NextResponse.json({ error: "غير موجودة" }, { status: 404 });
  return NextResponse.json({ ok: true });
}