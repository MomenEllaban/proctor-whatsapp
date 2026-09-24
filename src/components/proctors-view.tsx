"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Proctor, ProctorList } from "@/lib/types";
import { WaOpenButton } from "./wa-open-button";
import { del, patch, post, formatWhen } from "@/lib/client-api";
import { matchesQuery } from "@/lib/arabic";
import { normalizePhone } from "@/lib/normalizePhone";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ProctorsView({
  list,
  initialProctors,
}: {
  list: ProctorList;
  initialProctors: Proctor[];
}) {
  const router = useRouter();
  const [proctors, setProctors] = useState(initialProctors);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [toast, setToast] = useState("");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const applyPatch = (id: string, patchFn: (p: Proctor) => Proctor) => {
    setProctors((prev) => prev.map((p) => (p.id === id ? patchFn(p) : p)));
  };

  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast("");
      toastTimer.current = null;
    }, 2600);
  };

  const openedCount = useMemo(
    () => proctors.filter((p) => p.opened_at).length,
    [proctors],
  );

  const filtered = useMemo(() => {
    if (!q.trim()) return proctors;
    return proctors.filter((p) => matchesQuery(q, p.name, p.phone));
  }, [proctors, q]);

  const nextId = useMemo(() => {
    for (const p of proctors) {
      if (!p.opened_at) return p.id;
    }
    return null;
  }, [proctors]);

  const goNext = () => {
    if (!nextId) {
      flash("تم فتح WhatsApp للجميع ✓");
      return;
    }
    const el = cardRefs.current[nextId];
    el?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "center",
    });
    const flashId = window.setTimeout(() => {
      el?.classList.add("ring-4", "ring-wa/60");
      window.setTimeout(() => el?.classList.remove("ring-4", "ring-wa/60"), 1800);
    }, 350);
    void flashId;
  };

  const handleOpened = (id: string) => {
    applyPatch(id, (p) => ({ ...p, opened_at: p.opened_at ?? new Date().toISOString(), opened_count: p.opened_count + 1 }));
  };

  const resetOpened = async () => {
    if (!window.confirm("إعادة تعيين حالة «تم فتح WhatsApp» لكل مراقب في هذه القائمة؟")) return;
    setBusy(true);
    const res = await post(`/api/lists/${list.id}/reset`, {});
    setBusy(false);
    if (!res.ok) return flash(res.error ?? "تعذرت إعادة التعيين");
    setProctors((prev) =>
      prev.map((p) => ({ ...p, opened_at: null, opened_count: 0 })),
    );
    flash("تمت إعادة التعيين ✓");
  };

  const addProctor = async () => {
    setFormError("");
    const res = normalizePhone(addPhone, list.default_country_code);
    if (!res.valid) return setFormError(res.message);
    if (!addName.trim()) return setFormError("اكتب اسم المراقب");
    setBusy(true);
    const r = await post<{ added: number }>("/api/proctors", {
      listId: list.id,
      rows: [{ name: addName.trim(), phone: res.phone }],
    });
    setBusy(false);
    if (!r.ok) return setFormError(r.error ?? "تعذرت الإضافة");
    router.refresh();
    setAddName("");
    setAddPhone("");
    setAdding(false);
    flash("تمت الإضافة ✓");
  };

  const startEdit = (p: Proctor) => {
    setEditing(p.id);
    setEditName(p.name);
    setEditPhone(p.phone);
  };

  const saveEdit = async (p: Proctor) => {
    const res = normalizePhone(editPhone, list.default_country_code);
    if (!res.valid) return flash(res.message);
    if (!editName.trim()) return flash("الاسم فارغ");
    const r = await patch(`/api/proctors/${p.id}`, {
      name: editName.trim(),
      phone: res.phone,
    });
    if (!r.ok) return flash(r.error ?? "تعذر الحفظ");
    applyPatch(p.id, (x) => ({ ...x, name: editName.trim(), phone: res.phone! }));
    setEditing(null);
    flash("تم الحفظ ✓");
  };

  const removeProctor = async (p: Proctor) => {
    if (!window.confirm(`حذف «${p.name}» من القائمة؟`)) return;
    const r = await del(`/api/proctors/${p.id}`);
    if (!r.ok) return flash(r.error ?? "تعذر الحذف");
    setProctors((prev) => prev.filter((x) => x.id !== p.id));
    flash("تم الحذف");
  };

  const notFoundInQuery = filtered.length === 0 && q.trim() !== "";

  return (
    <div>
      {/* stats */}
      <section className="mb-4 grid grid-cols-2 gap-2" aria-label="إحصائيات">
        <div className="stat">
          <span>إجمالي المراقبين</span>
          <b>{proctors.length}</b>
        </div>
        <div className="stat">
          <span>تم فتح WhatsApp</span>
          <b>{openedCount}</b>
        </div>
      </section>

      {/* message preview */}
      <section className="card" aria-labelledby="pv">
        <h2 id="pv" className="mb-2 text-base font-extrabold">
          معاينة الرسالة
        </h2>
        <p className="message-preview mb-2 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink">
          <MessagePreview template={list.message_template} />
        </p>
        <p className="my-0 text-xs text-muted">
          يُفتح WhatsApp والرسالة مكتوبة مسبقًا بالاسم الخاص بكل مراقب — الإرسال
          يتم يدويًا بالضغط على Send داخل التطبيق.
        </p>
      </section>

      {/* toolbar */}
      <section className="card" aria-labelledby="tb">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="tb" className="m-0 text-base font-extrabold">
            قائمة المراقبين
          </h2>
          <span className="text-sm text-muted" aria-live="polite">
            عرض {filtered.length} من {proctors.length}
          </span>
        </div>

        <div className="relative">
          <input
            type="search"
            className="input"
            placeholder="🔎 البحث بالاسم أو الرقم..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="البحث عن مراقب بالاسم أو رقم الموبايل"
            autoComplete="off"
          />
        </div>

        {/* add manual */}
        <div className="mt-3">
          {adding ? (
            <div className="rounded-xl border border-line bg-bg p-3">
              <p className="my-1 text-sm font-bold">إضافة مراقب يدويًا</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-sm font-bold" htmlFor="add-proctor-name">
                  اسم المراقب
                  <input
                    id="add-proctor-name"
                    className="input mt-1"
                    placeholder="مثال: أحمد محمد"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
                <label className="text-sm font-bold" htmlFor="add-proctor-phone">
                  رقم الموبايل
                  <input
                    id="add-proctor-phone"
                    className="input mt-1"
                    dir="ltr"
                    placeholder="+20 100 606 0738"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    aria-describedby={formError ? "add-proctor-error" : undefined}
                  />
                </label>
              </div>
              {formError && (
                <p id="add-proctor-error" role="alert" className="mt-2 my-0 text-sm font-bold text-danger">
                  {formError}
                </p>
              )}
              <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                <button className="btn btn-ghost w-full" onClick={() => setAdding(false)}>
                  إلغاء
                </button>
                <button className="btn w-full" onClick={addProctor} disabled={busy}>
                  حفظ المراقب
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost mt-3 w-full" onClick={() => setAdding(true)}>
              + إضافة مراقب يدويًا
            </button>
          )}
        </div>
      </section>

      {/* list */}
      <div>
        {notFoundInQuery && (
          <div className="card text-center text-muted">
            لا يوجد مراقب مطابق للبحث. جرّب اسمًا أو رقمًا آخر.
          </div>
        )}
        {!notFoundInQuery && filtered.length === 0 && (
          <div className="card text-center text-muted">
            <p className="font-bold text-ink">لا يوجد مراقبون في هذه القائمة بعد</p>
            <p>استخدم الاستيراد من صورة أو نسخ/لصق لإضافة القائمة دفعة واحدة.</p>
            <Link
              href={`/lists/${list.id}/import`}
              className="btn mx-auto mt-2"
            >
              استيراد المراقبين
            </Link>
          </div>
        )}

        <ul className="m-0 list-none p-0">
          {filtered.map((p, i) => (
            <li key={p.id}>
              <div
                ref={(el) => {
                  cardRefs.current[p.id] = el;
                }}
                className="card mb-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 md:grid-cols-[auto_minmax(0,1fr)_auto_140px]"
              >
                <span className="text-lg font-extrabold text-greend" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="break-words font-bold leading-tight">
                    {p.name}
                    {p.opened_at && <span className="badge">تم فتح WhatsApp</span>}
                  </div>
                  <div className="phone-dir mt-1 text-sm">{p.phone}</div>
                  {p.opened_at && (
                    <div className="mt-1 text-xs text-muted">
                      آخر فتح: {formatWhen(p.opened_at)} • {p.opened_count} مرة
                    </div>
                  )}
                </div>
                {editing === p.id ? (
                  <div className="col-span-2 md:col-span-2 md:col-start-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        aria-label={`تعديل اسم ${p.name}`}
                      />
                      <input
                        className="input"
                        dir="ltr"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        aria-label="تعديل الرقم"
                        inputMode="tel"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button className="btn" onClick={() => saveEdit(p)}>
                        حفظ
                      </button>
                      <button className="btn btn-ghost" onClick={() => setEditing(null)}>
                        إلغاء
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => removeProctor(p)}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="row-start-2 col-start-1 col-span-2 md:row-start-auto md:col-span-1 md:col-start-3">
                      <div id={`proctor-${p.id}`} className="flex gap-2">
                        <button
                          type="button"
                          className="icon-btn border border-line text-ink"
                          aria-label={`تعديل ${p.name}`}
                          onClick={() => startEdit(p)}
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2 md:col-span-1 md:col-start-4">
                      <div className="flex gap-2">
                        <WaOpenButton
                          proctor={p}
                          template={list.message_template}
                          onOpened={handleOpened}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* sticky actions */}
      {(proctors.length > 0) && (
        <div className="sticky-actions grid grid-cols-1 gap-2 min-[360px]:flex">
          <button className="btn btn-ghost w-full min-w-0 min-[360px]:flex-1" onClick={resetOpened} disabled={busy}>
            إعادة تعيين
          </button>
          {nextId ? (
            <button className="btn w-full min-w-0 min-[360px]:flex-1" onClick={goNext}>
              التالي ← المتابعة
            </button>
          ) : (
            <button className="btn w-full min-w-0 min-[360px]:flex-1" onClick={goNext} disabled>
              تم فتح WhatsApp للجميع
            </button>
          )}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="action-toast fixed inset-x-4 z-50 mx-auto max-w-sm rounded-xl bg-head px-4 py-3 text-center text-headink shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function MessagePreview({ template }: { template: string }) {
  const text = template ?? "";
  if (!text.includes("{name}")) {
    return <>{text || "اكتب قالب الرسالة من صفحة التعديل — سيظهر هنا معاينة مباشرة."}</>;
  }
  return (
    <span className="whitespace-pre-wrap break-words text-ink">
      {text.split("{name}").flatMap((part, index) =>
        index === 0 ? (
          part
        ) : (
          [
            <span key={`name-${index}`} className="rounded bg-card px-1.5 font-bold text-greend">
              اسم المراقب
            </span>,
            part,
          ]
        ),
      )}
    </span>
  );
}