import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedByToken, isValidShareToken } from "@/lib/data";
import { BrandLockup } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { SharedProctorsView } from "@/components/shared-proctors-view";

export const dynamic = "force-dynamic";

/** A share link is a private capability — never let it into a search index. */
export const metadata: Metadata = {
  title: "قائمة مراقبين",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SharedListPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidShareToken(token)) notFound();

  let snapshot: Awaited<ReturnType<typeof getSharedByToken>> = null;
  try {
    snapshot = await getSharedByToken(token);
  } catch (error) {
    // Never surface a stack trace to an anonymous visitor.
    console.error("[shared-list] load failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  // Unknown, rotated, or switched off all look identical from out here.
  if (!snapshot) notFound();

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-40 app-head">
        <div
          style={{ height: "env(safe-area-inset-top, 0px)" }}
          aria-hidden="true"
        />
        <div className="app-head-bar">
          <div className="min-w-0 flex-1">
            <BrandLockup compact />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="mb-4">
          <h1 className="m-0 text-lg font-extrabold leading-tight break-words">
            {snapshot.list.title}
          </h1>
          <p className="my-0 text-sm text-muted">
            اضغط «فتح WhatsApp» وسيُفتح التطبيق والرسالة مكتوبة بالاسم — كلّم
            المراقب ثم اضغط Send.
          </p>
        </div>

        <SharedProctorsView
          key={snapshot.proctors.map((p) => p.id).join(",")}
          list={snapshot.list}
          token={token}
          initialProctors={snapshot.proctors}
        />
      </main>
    </div>
  );
}
