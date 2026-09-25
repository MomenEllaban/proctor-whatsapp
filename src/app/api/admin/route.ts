import { NextResponse } from "next/server";
import { getAdminOverview, getOptionalCurrentUser } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Platform overview for the admin panel. Admins only. */
export async function GET() {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });
  if (user.role !== "admin")
    return NextResponse.json({ error: "الصفحة للأدمن فقط" }, { status: 403 });
  return NextResponse.json({ overview: await getAdminOverview() });
}
