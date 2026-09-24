import { NextResponse } from "next/server";
import {
  getList,
  getOptionalCurrentUser,
  resetListOpened,
} from "@/lib/data";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { id } = await params;
  const list = await getList(user, id);
  if (!list) return NextResponse.json({ error: "غير موجودة" }, { status: 404 });
  const reset = await resetListOpened(user, id);
  if (!reset) {
    return NextResponse.json(
      { error: "تعذر إعادة تعيين الحالة. حاول مرة أخرى." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}