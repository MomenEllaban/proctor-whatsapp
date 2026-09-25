"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { del } from "@/lib/client-api";

export interface ListSummary {
  id: string;
  title: string;
  message_template: string;
  proctorCount: number;
  openedCount: number;
  created_at: string;
}

export function ListsDashboard({
  lists,
  userName,
}: {
  lists: ListSummary[];
  userName: string;
}) {
  const router = useRouter();

  const remove = async (id: string, title: string) => {
    if (
      !window.confirm(`حذف القائمة «${title}» نهائيًا مع أرقام المراقبين؟`)
    )
      return;
    const res = await del(`/api/lists/${id}`);
    if (!res.ok) {
      window.alert(res.error ?? "تعذر الحذف");
      return;
    }
    router.refresh();
  };

  const totals = lists.reduce(
    (acc, l) => ({
      proctors: acc.proctors + l.proctorCount,
      opened: acc.opened + l.openedCount,
    }),
    { proctors: 0, opened: 0 },
  );

  return (
    <div>
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-lg font-extrabold">قوائم المراقبة</h1>
          <p className="m-0 text-sm text-muted">
            أهلاً {userName || "بك"} — كل قائمة تحتوي على رسالتها ومراقبيها.
          </p>
        </div>
        <Link href="/lists/new" className="btn w-full shrink-0 min-[360px]:w-auto">
          + قائمة جديدة
        </Link>
      </section>

      <section className="stats-grid" aria-label="إحصائياتك">
        <div className="stat-tile">
          <b>{lists.length}</b>
          <span>قوائم</span>
          <small>امتحانات ولجان</small>
        </div>
        <div className="stat-tile">
          <b>{totals.proctors}</b>
          <span>مراقب</span>
          <small>أرقام وهمية</small>
        </div>
        <div className="stat-tile">
          <b>{totals.opened}</b>
          <span>تم الفتح</span>
          <small>فتح واتساب</small>
        </div>
        <div className="stat-tile">
          <b>{lists.length ? Math.round((totals.opened / Math.max(totals.proctors, 1)) * 100) : 0}%</b>
          <span>نسبة البدء</span>
          <small>من كل القوائم</small>
        </div>
      </section>

      {lists.length === 0 && (
        <section className="card text-center">
          <p className="font-bold">لا توجد قوائم بعد</p>
          <p className="text-sm text-muted">
            ابدأ بإنشاء أول قائمة (مثل: مراقبين امتحان EST1)، اضبط رسالة
            الجروب، ثم أضف المراقبين من صورة أو بالنسخ واللصق.
          </p>
          <Link href="/lists/new" className="btn mx-auto mt-2">
            إنشاء أول قائمة
          </Link>
        </section>
      )}

      <ul className="m-0 list-none p-0">
        {lists.map((l) => (
          <li key={l.id} className="card mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/lists/${l.id}`}
                className="flex min-h-11 items-center break-words text-base font-extrabold text-greend no-underline hover:underline"
              >
                {l.title}
              </Link>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted">
                <span>
                  {l.proctorCount} مراقب
                </span>
                <span>
                  تم فتح WhatsApp: {l.openedCount}
                </span>
                {!l.message_template.includes("{name}") && (
                  <span className="font-bold text-danger">
                    القالب لا يحتوي على {`{name}`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/lists/${l.id}/edit`}
                className="icon-btn border border-line text-ink"
                aria-label={`تعديل قائمة ${l.title}`}
                title="تعديل"
              >
                ✏️
              </Link>
              <button
                type="button"
                className="icon-btn border border-line text-danger"
                aria-label={`حذف قائمة ${l.title}`}
                title="حذف"
                onClick={() => remove(l.id, l.title)}
              >
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-center text-xs text-muted">
        نظام عام لإدارة ومتابعة المراقبين. يفتح WhatsApp فقط ولا يرسل أي رسالة
        تلقائيًا، وكل البيانات المعروضة أمثلة وهمية.
      </p>
    </div>
  );
}