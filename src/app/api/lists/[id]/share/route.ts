import { NextResponse } from "next/server";
import {
  getList,
  getOptionalCurrentUser,
  rotateShareToken,
  setShareEnabled,
} from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

/** Turn the public link on or off. Turning it off keeps the same URL dead. */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { id } = await params;
  const list = await getList(user, id);
  if (!list) return NextResponse.json({ error: "غير موجودة" }, { status: 404 });
  const { enabled } = await req.json().catch(() => ({}));
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "قيمة enabled غير صحيحة" }, { status: 400 });
  }
  const share = await setShareEnabled(user, id, enabled);
  if (!share) {
    return NextResponse.json({ error: "غير موجودة" }, { status: 404 });
  }
  return NextResponse.json({ share });
}

/** Mint a fresh token, immediately killing every previously shared copy. */
export async function POST(_req: Request, { params }: Params) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  const { id } = await params;
  const list = await getList(user, id);
  if (!list) return NextResponse.json({ error: "غير موجودة" }, { status: 404 });
  const share_token = await rotateShareToken(user, id);
  if (!share_token) {
    return NextResponse.json(
      { error: "تعذر إنشاء لينك جديد. حاول مرة أخرى." },
      { status: 500 },
    );
  }
  return NextResponse.json({
    share: { share_token, share_enabled: list.share_enabled },
  });
}
