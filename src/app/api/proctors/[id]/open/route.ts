import { NextResponse } from "next/server";
import { getOptionalCurrentUser, markProctorOpened } from "@/lib/data";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getOptionalCurrentUser();
  if (user) {
    const { id } = await params;
    await markProctorOpened(user, id);
  }
  // Always 200: the WhatsApp link opens regardless of tracking success.
  return NextResponse.json({ ok: true });
}