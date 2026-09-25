import Link from "next/link";
import { CreateListForm } from "@/components/list-forms";

export const metadata = { title: "قائمة جديدة" };

export default function NewListPage() {
  return (
    <div>
      <Link
        href="/lists"
        className="back-link mb-1"
      >
        ← رجوع للقوائم
      </Link>
      <h1 className="m-0 text-xl font-extrabold">قائمة مراقبة جديدة</h1>
      <p className="mt-1 mb-4 text-sm text-muted">
        الرسالة جاهزة بالشكل الصح — كل قائمة لمجموعة مراقبين بيستلموا نفس
        الرسالة (مع اسم كل مراقب)،whether لامتحان أو لجنة.
      </p>
      <CreateListForm />
    </div>
  );
}