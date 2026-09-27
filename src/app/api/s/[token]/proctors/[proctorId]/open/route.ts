import { NextResponse } from "next/server";
import { isValidShareToken, markSharedOpened } from "@/lib/data";

/**
 * Open tracking for share-link visitors, who have no session. Deliberately
 * always answers 200 like /api/proctors/[id]/open: the WhatsApp link must open
 * whether or not the counter ticked.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string; proctorId: string }> },
) {
  const { token, proctorId } = await params;
  if (!isValidShareToken(token)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    await markSharedOpened(token, proctorId);
  } catch (error) {
    console.error("[shared-open] tracking failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return NextResponse.json({ ok: true });
}
