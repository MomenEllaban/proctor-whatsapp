import Link from "next/link";

export default function ListNotFound() {
  return (
    <div className="card mx-auto max-w-xl text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-head text-2xl text-headink" aria-hidden="true">
        🔎
      </div>
      <h1 className="m-0 text-xl font-extrabold">القائمة غير متاحة</h1>
      <p className="mt-2 text-sm text-muted">
        لم يتم العثور على هذه القائمة على السيرفر. في وضع Demo على Vercel قد تكون
        البيانات المؤقتة قد انتهت أو أن الرابط قديم.
      </p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link href="/lists" className="btn btn-ghost">العودة إلى القوائم</Link>
        <Link href="/lists/new" className="btn">إنشاء قائمة جديدة</Link>
      </div>
    </div>
  );
}
