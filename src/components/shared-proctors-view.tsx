"use client";

import { useMemo, useState } from "react";
import type { SharedList, SharedProctor } from "@/lib/types";
import { WaOpenButton } from "./wa-open-button";
import { MessagePreview } from "./proctors-view";
import { matchesQuery } from "@/lib/arabic";

/**
 * The share link's read-only view. Nothing here can mutate data — no edit, no
 * delete, no import — it only sends the pre-filled WhatsApp deep link.
 */
export function SharedProctorsView({
  list,
  token,
  initialProctors,
}: {
  list: SharedList;
  token: string;
  initialProctors: SharedProctor[];
}) {
  const [proctors, setProctors] = useState(initialProctors);
  const [q, setQ] = useState("");

  const openedCount = useMemo(
    () => proctors.filter((p) => p.opened_at).length,
    [proctors],
  );

  const filtered = useMemo(() => {
    if (!q.trim()) return proctors;
    return proctors.filter((p) => matchesQuery(q, p.name, p.phone));
  }, [proctors, q]);

  const notFoundInQuery = filtered.length === 0 && q.trim() !== "";

  const handleOpened = (id: string) => {
    setProctors((prev) =>
      prev.map((p) =>
        p.id === id && !p.opened_at
          ? { ...p, opened_at: new Date().toISOString() }
          : p,
      ),
    );
  };

  return (
    <div>
      <section className="mb-4 grid grid-cols-2 gap-2" aria-label="إحصائيات">
        <div className="stat">
          <span>عدد المراقبين</span>
          <b>{proctors.length}</b>
        </div>
        <div className="stat">
          <span>تم فتح WhatsApp</span>
          <b>{openedCount}</b>
        </div>
      </section>

      <section className="card" aria-labelledby="spv">
        <h2 id="spv" className="mb-2 text-base font-extrabold">
          نص الرسالة
        </h2>
        <p className="message-preview mb-0 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink">
          <MessagePreview template={list.message_template} />
        </p>
      </section>

      {proctors.length > 0 && (
        <section className="card" aria-labelledby="stb">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 id="stb" className="m-0 text-base font-extrabold">
              قائمة المراقبين
            </h2>
            <span className="text-sm text-muted" aria-live="polite">
              عرض {filtered.length} من {proctors.length}
            </span>
          </div>
          <input
            type="search"
            className="input"
            placeholder="🔎 البحث بالاسم أو الرقم..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="البحث عن مراقب بالاسم أو رقم الموبايل"
            autoComplete="off"
          />
        </section>
      )}

      <div>
        {notFoundInQuery && (
          <div className="card text-center text-muted">
            لا يوجد مراقب مطابق للبحث. جرّب اسمًا أو رقمًا آخر.
          </div>
        )}

        {!notFoundInQuery && proctors.length === 0 && (
          <div className="card text-center text-muted">
            <p className="font-bold text-ink">لم تتم إضافة مراقبين بعد</p>
            <p>ارجع لصاحب القائمة وحاول مرة أخرى لاحقًا.</p>
          </div>
        )}

        <ul className="m-0 list-none p-0">
          {filtered.map((p, i) => (
            <li key={p.id}>
              <div className="card mb-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 md:grid-cols-[auto_minmax(0,1fr)_150px]">
                <span className="text-lg font-extrabold text-greend" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="break-words font-bold leading-tight">
                    {p.name}
                    {p.opened_at && <span className="badge">تم فتح WhatsApp</span>}
                  </div>
                  <div className="phone-dir mt-1 text-sm">{p.phone}</div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <WaOpenButton
                    proctor={p}
                    template={list.message_template}
                    onOpened={handleOpened}
                    trackUrl={`/api/s/${encodeURIComponent(token)}/proctors/${encodeURIComponent(p.id)}/open`}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
