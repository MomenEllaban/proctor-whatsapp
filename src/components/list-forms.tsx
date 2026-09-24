"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TemplateEditor } from "./template-editor";
import { post, patch, del } from "@/lib/client-api";
import type { ProctorList } from "@/lib/types";

/** Create a new list, one clear step at a time. */
export function CreateListForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!title.trim()) return setError("اكتب اسم القائمة أولًا");
    setBusy(true);
    const res = await post<{ list: ProctorList }>("/api/lists", {
      title,
      message_template: template,
      default_country_code: "20",
    });
    setBusy(false);
    if (!res.ok || !res.data) return setError(res.error ?? "تعذر إنشاء القائمة");
    router.push(`/lists/${res.data.list.id}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="card">
        <div className="step">
          <span className="step-num" aria-hidden>
            1
          </span>
          <div>
            <label htmlFor="list-title" className="step-title">اسم القائمة</label>
            <div className="step-hint">
              أي اسم يوضّح لك المحتوى — مثل الامتحان أو التاريخ
            </div>
          </div>
        </div>
        <input
          id="list-title"
          className="input"
          placeholder="مثال: مراقبين امتحان EST1"
          aria-label="اسم قائمة المراقبة"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          aria-invalid={!!error}
          aria-describedby={error ? "list-title-error" : undefined}
        />
        {error && (
          <p id="list-title-error" role="alert" className="field-error m-0">
            {error}
          </p>
        )}
      </div>

      <div className="card">
        <div className="step">
          <span className="step-num" aria-hidden>
            2
          </span>
          <div>
            <div className="step-title">رسالة WhatsApp للمراقبين</div>
            <div className="step-hint">
              نفس الرسالة للكل، و{`{name}`} يتغير لاسم كل مراقب
            </div>
          </div>
        </div>
        <TemplateEditor value={template} onChange={setTemplate} />
      </div>

      <div className="card">
        <button className="btn w-full" disabled={busy}>
          {busy ? "جارٍ الإنشاء..." : "إنشاء القائمة"}
        </button>
        <p className="my-2 text-center text-xs text-muted">
          بعد الإنشاء هينقلك مباشرة لإضافة المراقبين (يدويًا، لصق، أو من صورة).
        </p>
      </div>
    </form>
  );
}

/** Edit an existing list: title, template, delete. */
export function EditListForm({ list }: { list: ProctorList }) {
  const router = useRouter();
  const [title, setTitle] = useState(list.title);
  const [template, setTemplate] = useState(list.message_template);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [titleError, setTitleError] = useState("");

  const save = async () => {
    setError("");
    setTitleError("");
    if (!title.trim()) return setTitleError("اكتب اسم القائمة أولًا");
    setBusy(true);
    const res = await patch<{ list: ProctorList }>(`/api/lists/${list.id}`, {
      title,
      message_template: template,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "تعذر الحفظ");
    router.replace(`/lists/${list.id}?saved=1`);
  };

  const remove = async () => {
    if (
      !window.confirm(
        "حذف هذه القائمة نهائيًا مع كل أرقام المراقبين؟ لا يمكن التراجع.",
      )
    )
      return;
    setBusy(true);
    const res = await del(`/api/lists/${list.id}`);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "تعذر الحذف");
    router.replace("/lists");
  };

  return (
    <div>
      <div className="card">
        <div className="step">
          <span className="step-num" aria-hidden>
            1
          </span>
          <div>
            <label htmlFor="list-title" className="step-title">اسم القائمة</label>
          </div>
        </div>
        <input
          id="list-title"
          className="input"
          aria-label="اسم قائمة المراقبة"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleError("");
          }}
          maxLength={120}
          aria-invalid={!!titleError}
          aria-describedby={titleError ? "list-title-error" : undefined}
        />
        {titleError && (
          <p id="list-title-error" role="alert" className="field-error m-0">
            {titleError}
          </p>
        )}
      </div>

      <div className="card">
        <div className="step">
          <span className="step-num" aria-hidden>
            2
          </span>
          <div>
            <div className="step-title">رسالة WhatsApp للمراقبين</div>
          </div>
        </div>
        <TemplateEditor value={template} onChange={setTemplate} />
      </div>

      {error && (
        <p role="alert" className="m-0 mb-3 font-bold text-danger">
          {error}
        </p>
      )}

      <div className="card flex flex-col gap-2">
        <button className="btn w-full" onClick={save} disabled={busy}>
          {busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </button>
        <button className="btn btn-danger w-full" onClick={remove} disabled={busy}>
          حذف القائمة (مع أرقام المراقبين)
        </button>
      </div>
    </div>
  );
}