import { NextResponse } from "next/server";
import { getOptionalCurrentUser, setUserRole } from "@/lib/data";
import { isUserRole } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

/** Updates one user's role. Admins only. */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "الصفحة للأدمن فقط" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const role = body?.role;
  if (!isUserRole(role))
    return NextResponse.json({ error: "دور غير معروف" }, { status: 400 });
  if (id === user.id && role !== "admin")
    return NextResponse.json(
      { error: "مينفعش تشيل صلاحيات الأدمن عن نفسك" },
      { status: 400 },
    );

  const ok = await setUserRole(id, role);
  if (!ok)
    return NextResponse.json(
      { error: "المستخدم غير موجود أو محمي من التعديل" },
      { status: 404 },
    );
  return NextResponse.json({ ok: true, role });
}
