import { NextResponse } from "next/server";
import {
  bulkAddProctors,
  getList,
  getProctors,
  getOptionalCurrentUser,
} from "@/lib/data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { id } = await params;
  const list = await getList(user, id);
  if (!list) return NextResponse.json({ error: "غير موجودة" }, { status: 404 });
  const proctors = await getProctors(user, id);
  return NextResponse.json({ list, proctors });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const rows: { name: string; phone: string }[] = Array.isArray(body.rows)
    ? body.rows
    : [];
  if (!rows.length) {
    return NextResponse.json({ error: "لا توجد بيانات للإضافة" }, { status: 400 });
  }
  const list = await getList(user, id);
  if (!list) return NextResponse.json({ error: "غير موجودة" }, { status: 404 });

  // Normalize + validate each row; invalid phones are rejected.
  const { normalizePhone } = await import("@/lib/normalizePhone");
  const clean: { name: string; phone: string }[] = [];
  for (const r of rows) {
    const name = String(r.name ?? "").trim().slice(0, 200);
    const res = normalizePhone(r.phone, list.default_country_code);
    if (!res.valid || !name) {
      return NextResponse.json(
        { error: `السطر "${name || res.message}" غير صالح: ${res.message}` },
        { status: 422 },
      );
    }
    clean.push({ name, phone: res.phone! });
  }

  const added = await bulkAddProctors(user, id, clean);
  return NextResponse.json({ added, list });
}