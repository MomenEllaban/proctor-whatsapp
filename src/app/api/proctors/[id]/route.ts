import { NextResponse } from "next/server";
import {
  deleteProctor,
  getList,
  getProctor,
  getOptionalCurrentUser,
  updateProctor,
} from "@/lib/data";
import { normalizePhone } from "@/lib/normalizePhone";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const proctor = await getProctor(user, id);
  if (!proctor) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const list = await getList(user, proctor.list_id);

  const patch: { name?: string; phone?: string } = {};
  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 200);
    if (!name) return NextResponse.json({ error: "الاسم فارغ" }, { status: 400 });
    patch.name = name;
  }
  if (typeof body.phone === "string") {
    const res = normalizePhone(body.phone, list?.default_country_code || "20");
    if (!res.valid || !res.phone) {
      return NextResponse.json({ error: res.message }, { status: 422 });
    }
    patch.phone = res.phone;
  }
  await updateProctor(user, id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { id } = await params;
  const proctor = await getProctor(user, id);
  if (!proctor) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await deleteProctor(user, id);
  return NextResponse.json({ ok: true });
}