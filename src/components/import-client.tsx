"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftRow, ProctorList } from "@/lib/types";
import { checkRows, summarizeChecks } from "@/lib/review";
import { parseProctorsFromText, countBrokenRows } from "@/lib/parser";
import { prepareImage } from "@/lib/image-prep";
import { post, api } from "@/lib/client-api";
import { uid } from "@/lib/uid";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ImportClient({
  list,
  existingPhones,
}: {
  list: ProctorList;
  existingPhones: string[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"paste" | "photo">("paste");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const existingSet = useMemo(() => new Set(existingPhones), [existingPhones]);

  const checks = useMemo(
    () => (rows ? checkRows(rows, list.default_country_code, existingSet) : new Map()),
    [rows, list.default_country_code, existingSet],
  );
  const summary = useMemo(() => summarizeChecks(checks), [checks]);

  const startReview = (drafts: DraftRow[], labelSrc: string) => {
    setRows(drafts);
    setSourceLabel(labelSrc);
    setError("");
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const extractFromText = async () => {
    setError("");
    if (!text.trim()) return setError("الصق النص أولًا (من Excel أو WhatsApp أو قائمة أسماء)");
    setBusy(true);
    setProgress("جارٍ قراءة النص...");
    try {
      let drafts = parseProctorsFromText(text);
      let src = "نص";
      const localBrokenRatio = drafts.length
        ? countBrokenRows(drafts) / drafts.length
        : 1;
      if (!drafts.length || localBrokenRatio > 0.5) {
        const res = await api<{ rows: { name: string; phone: string }[] }>(
          "/api/extract/text",
          { method: "POST", body: JSON.stringify({ text }) },
        );
        if (res.ok && res.data?.rows?.length) {
          const llm = res.data.rows.map((r) => ({
            id: uid(),
            name: r.name ?? "",
            rawPhone: r.phone ?? "",
          }));
          const llmBroken = countBrokenRows(llm) / llm.length;
          if (llmBroken < localBrokenRatio) {
            drafts = llm;
            src = "الذكاء الاصطناعي";
          }
        }
      }
      if (!drafts.length) {
        throw new Error("لم يتم العثور على أسماء وأرقام في النص. جرّب تحسين التنسيق.");
      }
      startReview(drafts, src);
    } catch (e) {
      setError((e as Error).message || "تعذر قراءة النص");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const onFiles = async (files: File[]) => {
    setError("");
    if (!files.length) return;
    if (files.length > 10) return setError("اختر 10 صور على الأكثر في المرة الواحدة");
    setBusy(true);
    try {
      const form = new FormData();
      for (let i = 0; i < files.length; i++) {
        setProgress(`معالجة الصورة ${i + 1} من ${files.length}...`);
        const { blob, name } = await prepareImage(files[i]);
        form.append("images", blob, name);
      }
      setProgress("جارٍ استخراج الأسماء والأرقام من الصورة...");
      const res = await api<{
        rows: { name: string; phone: string }[];
        warnings: string[];
      }>("/api/extract/photos", { method: "POST", body: form });
      if (!res.ok) {
        throw new Error(res.error ?? "تعذر معالجة الصور");
      }
      const extras = res.data?.warnings?.length
        ? "\n" + res.data.warnings.join("\n")
        : "";
      if (!res.data?.rows?.length) {
        throw new Error("لم يتعرف النظام على أسماء أو أرقام. جرب صورة أوضح أو استخدم اللصق." + extras);
      }
      startReview(
        res.data.rows.map((r) => ({ id: uid(), name: r.name ?? "", rawPhone: r.phone ?? "" })),
        `صورة (${files.length})`,
      );
    } catch (e) {
      setError((e as Error).message || "تعذر معالجة الصور");
    } finally {
      setBusy(false);
      setProgress("");
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  /* ---------------- review screen ---------------- */
  if (rows) {
    return (
      <ReviewScreen
        list={list}
        rows={rows}
        sourceLabel={sourceLabel}
        checks={checks}
        summary={summary}
        onChange={(drafts, changedId) => {
          setRows(drafts);
          setError("");
          void changedId;
        }}
        error={error}
        onBack={() => {
          setRows(null);
          setError("");
          router.refresh();
        }}
        onAdd={() =>
          setRows((prev) => prev && [...prev, { id: uid(), name: "", rawPhone: "" }])
        }
        onDelete={(id) => setRows((prev) => prev?.filter((r) => r.id !== id) ?? null)}
        onSave={() => onSave(rows, checks)}
        busy={busy}
      />
    );
  }

  /* ---------------- choose source ---------------- */

  return (
    <div>
      <div className="mb-4">
        <h1 className="m-0 text-lg font-extrabold">استيراد المراقبين</h1>
        <p className="m-0 text-sm text-muted">
          للتأكد من صحة البيانات، ستعرض شاشة مراجعة قبل الحفظ — لا يُحفظ شيء تلقائيًا.
        </p>
      </div>

      <div className="card">
        <div
          className="mb-3 grid grid-cols-2 gap-2"
          role="tablist"
          aria-label="طريقة الاستيراد"
          aria-orientation="horizontal"
        >
          <button
            type="button"
            id="paste-tab"
            role="tab"
            aria-selected={tab === "paste"}
            aria-controls="paste-panel"
            tabIndex={tab === "paste" ? 0 : -1}
            className={`btn whitespace-nowrap px-2 sm:px-4 ${tab === "paste" ? "" : "btn-ghost"}`}
            onClick={() => setTab("paste")}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                setTab("photo");
                requestAnimationFrame(() => document.getElementById("photo-tab")?.focus());
              }
            }}
          >
            📋 لصق النص
          </button>
          <button
            type="button"
            id="photo-tab"
            role="tab"
            aria-selected={tab === "photo"}
            aria-controls="photo-panel"
            tabIndex={tab === "photo" ? 0 : -1}
            className={`btn whitespace-nowrap px-2 sm:px-4 ${tab === "photo" ? "" : "btn-ghost"}`}
            onClick={() => setTab("photo")}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                setTab("paste");
                requestAnimationFrame(() => document.getElementById("paste-tab")?.focus());
              }
            }}
          >
            📷 من صورة
          </button>
        </div>

        {tab === "paste" && (
          <div id="paste-panel" role="tabpanel" aria-labelledby="paste-tab" tabIndex={0}>
            <label className="mb-1 block text-sm font-bold" htmlFor="paste-text">
              الصق الأسماء والأرقام (من Excel أو Word أو WhatsApp): سطر لكل مراقب
            </label>
            <textarea
              id="paste-text"
              className="input min-h-56 resize-y leading-relaxed"
              dir="rtl"
              aria-label="النص المكوّن من أسماء وأرقام المراقبين"
              placeholder={"اسم المراقب 01\t201000000001\nاسم المراقب 02\t201000000002\n..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn mt-3 w-full" onClick={extractFromText} disabled={busy}>
              {busy ? progress : "استخراج الأسماء والأرقام"}
            </button>
            {!busy && text && (
              <button
                className="btn btn-ghost mt-2 w-full"
                onClick={() => setText("")}
              >
                مسح النص
              </button>
            )}
          </div>
        )}

        {tab === "photo" && (
          <div id="photo-panel" role="tabpanel" aria-labelledby="photo-tab" tabIndex={0}>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              onChange={(e) => onFiles(Array.from(e.target.files ?? []))}
              id="photo-input"
              aria-describedby="photo-help photo-security"
            />
            <button
              type="button"
              className="btn w-full"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              aria-describedby="photo-help photo-security"
            >
              {busy ? progress : "📷 اختر صورًا أو افتح الكاميرا"}
            </button>
            <p id="photo-help" className="my-1 text-center text-xs text-muted">
              يدعم التصوير أو اختيار أكثر من صورة، ويتعامل مع صور iPhone (.HEIC)
              وقوائم مرسومة يدويًا ومطبوعة وملتقطة للشاشة.
            </p>
            <p id="photo-security" className="my-0 text-center text-xs text-muted">
              🔒 تُستخدم الصور فقط لاستخراج الأسماء والأرقام ولا يتم تخزينها على الخادم.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-line bg-card px-3 py-2 font-bold text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="card">
        <p className="m-0 text-sm font-bold">أو أضف مراقبًا يدويًا الآن:</p>
        <a href={`/lists/${list.id}`} className="btn btn-ghost mt-2 w-full">
          رجوع للقائمة بدون استيراد
        </a>
      </div>
    </div>
  );

  async function onSave(drafts: DraftRow[], map: Map<string, import("@/lib/types").RowCheck>) {
    setBusy(true);
    setError("");
    const valid: { name: string; phone: string }[] = [];
    let skippedDup = 0;
    for (const r of drafts) {
      const c = map.get(r.id);
      if (!c || c.noName) continue;
      if (c.status === "valid") valid.push({ name: r.name.trim(), phone: c.phone! });
      else if (c.status === "duplicate") skippedDup++;
    }
    if (!valid.length) {
      setBusy(false);
      setError("لا توجد سطور صالحة للحفظ — أصلح الأرقام أو أضف مراقبين.");
      return;
    }
    const res = await post<{ added: number }>("/api/proctors", {
      listId: list.id,
      rows: valid,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "تعذر الحفظ");
    router.push(
      `/lists/${list.id}?imported=${res.data?.added ?? valid.length}${skippedDup ? `&dup=${skippedDup}` : ""}`,
    );
  }
}

/* ------------------------------------------------------------------ */

function ReviewScreen({
  list,
  rows,
  sourceLabel,
  checks,
  summary,
  onChange,
  onBack,
  onAdd,
  onDelete,
  onSave,
  busy,
  error,
}: {
  list: ProctorList;
  rows: DraftRow[];
  sourceLabel: string;
  checks: Map<string, import("@/lib/types").RowCheck>;
  summary: ReturnType<typeof summarizeChecks>;
  onChange: (rows: DraftRow[], changedId: string) => void;
  onBack: () => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  busy: boolean;
  error: string;
}) {
  const problemText = summary.broken > 0
    ? `يوجد ${summary.broken} رقم غير صالح — ثبّت الأرقام لإتمام الحفظ.`
    : "";
  const dupText = summary.duplicates > 0
    ? `سيتم تخطي ${summary.duplicates} رقم مكرر عند الحفظ.`
    : "";
  const nameText = summary.missingNames > 0
    ? `يوجد ${summary.missingNames} صف بدون اسم.`
    : "";
  const blocked = summary.broken > 0 || summary.missingNames > 0;
  const validationMessages = [problemText, dupText, nameText].filter(Boolean);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="m-0 text-lg font-extrabold">مراجعة البيانات</h1>
          <p className="m-0 text-sm text-muted">
            المصدر: {sourceLabel} — راجع الأسماء والأرقام ثم احفظ
          </p>
        </div>
        <button className="btn btn-ghost" onClick={onBack} disabled={busy}>
          إلغاء
        </button>
      </div>

      {error && (
        <p role="alert" className="card mb-2 my-0 border-red-200 bg-red-50 font-bold text-danger dark:border-red-900 dark:bg-red-950">
          {error}
        </p>
      )}

      {validationMessages.length > 0 && (
        <div
          role="status"
          className={`card mb-2 font-bold ${blocked ? "text-danger" : "text-warning"}`}
        >
          {validationMessages.map((message) => (
            <p key={message} className="my-0">{message}</p>
          ))}
        </div>
      )}

      <ul className="m-0 list-none p-0">
        {rows.map((r, i) => {
          const c = checks.get(r.id);
          return (
            <li key={r.id} className="card mb-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-greend">{i + 1}</span>
                <button
                  type="button"
                  className="icon-btn border border-line text-danger"
                  aria-label={`حذف الصف ${i + 1}`}
                  onClick={() => onDelete(r.id)}
                  disabled={busy}
                >
                  حذف
                </button>
              </div>
              <input
                className="input mb-2"
                value={r.name}
                placeholder="اسم المراقب"
                onChange={(e) =>
                  onChange(
                    rows.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)),
                    r.id,
                  )
                }
                aria-label={`اسم المراقب ${i + 1}`}
              />
              <input
                className="input"
                dir="ltr"
                inputMode="tel"
                value={r.rawPhone}
                placeholder="01XXXXXXXXX أو 201XXXXXXXXX"
                onChange={(e) =>
                  onChange(
                    rows.map((x) => (x.id === r.id ? { ...x, rawPhone: e.target.value } : x)),
                    r.id,
                  )
                }
                aria-label={`رقم موبايل المراقب ${i + 1}`}
              />
              {c && (
                <p className={`mt-1 my-0 text-sm font-bold ${statusColor(c.status)}`}>
                  {statusLabel(c.status, c.phone, c.message)}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <button className="btn btn-ghost w-full" onClick={onAdd} disabled={busy}>
        + إضافة صف يدويًا
      </button>

      <div className="sticky-actions flex flex-col gap-2">
        {blocked && (
          <p className="my-0 text-center text-sm font-bold text-danger">
            {problemText || nameText}
          </p>
        )}
        <button className="btn w-full" onClick={onSave} disabled={busy || blocked}>
          {busy
            ? "جارٍ الحفظ..."
            : `حفظ ${summary.validRows} مراقب في «${list.title}»`}
        </button>
      </div>
    </div>
  );
}

function statusColor(s: string): string {
  switch (s) {
    case "valid":
      return "text-greend";
    case "duplicate":
      return "text-warning";
    default:
      return "text-danger";
  }
}

function statusLabel(
  status: string,
  phone: string | null,
  message: string,
): string {
  switch (status) {
    case "valid":
      return `✓ سيُحفظ بالرقم الدولي ${phone}`;
    case "empty":
      return "✗ الرقم غير مكتوب";
    case "duplicate":
      return `⨯ مكرر: ${message}`;
    default:
      return `✗ ${message}`;
  }
}