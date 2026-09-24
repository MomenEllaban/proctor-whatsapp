import { notFound } from "next/navigation";
import Link from "next/link";
import { getList, getProctors, getSessionUser } from "@/lib/data";
import { ImportClient } from "@/components/import-client";

export const metadata = { title: "استيراد المراقبين" };

export const dynamic = "force-dynamic";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();
  const list = await getList(user, id);
  if (!list) notFound();
  const proctors = await getProctors(user, id);

  return (
    <div>
      <div className="mb-4">
        <Link href={`/lists/${id}`} className="back-link">
          ← رجوع للقائمة
        </Link>
      </div>
      <ImportClient list={list} existingPhones={proctors.map((p) => p.phone)} />
    </div>
  );
}