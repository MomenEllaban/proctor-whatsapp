import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getList, getProctors, getSessionUser } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { ProctorsView } from "@/components/proctors-view";

export const dynamic = "force-dynamic";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const list = await getList(user, id);
  if (!list) {
    console.error("[list-detail] server-not-found", {
      listId: id,
      userId: user.id,
      provider: isDemo ? "demo" : "supabase",
    });
    notFound();
  }
  const proctors = await getProctors(user, id);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Link
            href="/lists"
            className="back-link"
          >
            ← القوائم
          </Link>
          <h1 className="m-0 text-lg font-extrabold leading-tight break-words">
            {list.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/lists/${id}/import`} className="btn btn-ghost text-sm">
            + استيراد
          </Link>
          <Link href={`/lists/${id}/edit`} className="btn btn-ghost text-sm">
            ✏️ تعديل القالب
          </Link>
        </div>
      </div>

      <Suspense fallback={<p className="text-center text-muted">...</p>}>
        <ProctorsView
          key={proctors.map((proctor) => proctor.id).join(",")}
          list={list}
          initialProctors={proctors}
        />
      </Suspense>
    </div>
  );
}