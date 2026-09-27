import Link from "next/link";

/** Shown for unknown, rotated, or switched-off share links — all identical. */
export default function SharedLinkNotFound() {
  return (
    <main className="auth-shell">
      <div className="card my-auto w-full max-w-md text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-head text-2xl text-headink" aria-hidden="true">
          🔒
        </div>
        <h1 className="m-0 text-xl font-extrabold">اللينك مش شغال</h1>
        <p className="mt-2 text-sm text-muted">
          يمكن يكون صاحب القائمة قفل المشاركة، أو غيّر اللينك، أو اللينك قديم.
          كلّمه يبعتهال تاني.
        </p>
        <Link href="/login" className="btn mt-5 w-full">
          تسجيل الدخول
        </Link>
      </div>
    </main>
  );
}
