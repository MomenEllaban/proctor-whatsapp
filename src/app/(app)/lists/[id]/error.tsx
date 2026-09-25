"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ListDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[list-detail] client/server boundary", {
      message: error.message,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="card mx-auto max-w-xl text-center" role="alert">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-head text-2xl text-headink" aria-hidden="true">
        !
      </div>
      <h1 className="m-0 text-xl font-extrabold">تعذر تحميل القائمة</h1>
      <p className="mt-2 text-sm text-muted">
        حدث خطأ أثناء تحميل البيانات. السبب التفصيلي موجود في Console المتصفح.
      </p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link href="/lists" className="btn btn-ghost">العودة إلى القوائم</Link>
        <button type="button" className="btn" onClick={() => reset()}>إعادة المحاولة</button>
      </div>
    </div>
  );
}
