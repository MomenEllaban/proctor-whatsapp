import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-shell">
      <div className="card my-auto w-full max-w-md text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-head text-2xl text-headink" aria-hidden="true">
          🔎
        </div>
        <h1 className="m-0 text-xl font-extrabold">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm text-muted">
          يبدو أن الرابط الذي فتحته غير صحيح أو أن العنصر لم يعد متاحًا.
        </p>
        <Link href="/lists" className="btn mt-5 w-full">
          العودة إلى القوائم
        </Link>
      </div>
    </main>
  );
}
