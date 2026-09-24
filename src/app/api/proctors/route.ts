import { NextResponse } from "next/server";
import {
  bulkAddProctors,
  getList,
  getOptionalCurrentUser,
} from "@/lib/data";
import { normalizePhone } from "@/lib/normalizePhone";

export async function POST(req: Request) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { listId, rows } = await req.json().catch(() => ({}));
  if (!listId || !Array.isArray(rows)) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }
  const list = await getList(user, listId);
  if (!list) return NextResponse.json({ error: "غير موجودة" }, { status: 404 });

  const clean: { name: string; phone: string }[] = [];
  for (const r of rows) {
    const name = String(r.name ?? "").trim().slice(0, 200);
    const res = normalizePhone(r.phone, list.default_country_code);
    // Confirmed rows may still contain a to-be-fixed number: keep valid ones.
    if (!name || !res.valid) continue;
    clean.push({ name, phone: res.phone! });
  }
  if (!clean.length) {
    return NextResponse.json(
      { error: "لم يتم العثور على سطور صالحة — راجع الملاحظات وأصلح الأرقام ثم أعد المحاولة" },
      { status: 422 },
    );
  }
  const added = await bulkAddProctors(user, listId, clean);
  return NextResponse.json({ added });
}