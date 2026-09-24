"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="auth-shell">
      <div className="card my-auto w-full max-w-md text-center" role="alert">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-head text-2xl text-headink" aria-hidden="true">
          !
        </div>
        <h1 className="m-0 text-xl font-extrabold">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-sm text-muted">
          لم نفقد بياناتك. حاول تحميل هذا الجزء مرة أخرى.
        </p>
        <button type="button" className="btn mt-5 w-full" onClick={() => reset()}>
          إعادة المحاولة
        </button>
      </div>
    </main>
  );
}
