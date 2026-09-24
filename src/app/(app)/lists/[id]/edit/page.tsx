import { notFound } from "next/navigation";
import Link from "next/link";
import { getList, getSessionUser } from "@/lib/data";
import { EditListForm } from "@/components/list-forms";

export const metadata = { title: "تعديل القائمة" };

export const dynamic = "force-dynamic";

export default async function EditListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();
  const list = await getList(user, id);
  if (!list) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link href={`/lists/${id}`} className="back-link">
          ← رجوع للقائمة
        </Link>
        <h1 className="m-0 text-lg font-extrabold">تعديل «{list.title}»</h1>
      </div>
      <EditListForm list={list} />
    </div>
  );
}