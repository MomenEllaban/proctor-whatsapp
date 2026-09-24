"use client";

import { useCallback, useRef, useState } from "react";
import { NAME_PLACEHOLDER } from "@/lib/message";

/** Textarea for the message template with a {name} insert button + live preview. */
export function TemplateEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [selStart, setSelStart] = useState<number | null>(null);

  const insertPlaceholder = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = selStart ?? el.selectionStart;
    const end = selStart ?? el.selectionEnd;
    const next = value.slice(0, start) + NAME_PLACEHOLDER + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + NAME_PLACEHOLDER.length;
      el.setSelectionRange(pos, pos);
    });
  }, [value, onChange, selStart]);

  const preview = previewText(value);

  return (
    <div>
      <div className="toolbar">
        <span className="text-xs text-muted">
          {`{name}`} يُستبدل تلقائيًا باسم المراقب عند فتح الرسالة
        </span>
        <button type="button" className="chip" onClick={insertPlaceholder}>
          + إدراج {`{name}`}
        </button>
      </div>

      <textarea
        ref={ref}
        className="input min-h-36 resize-y leading-relaxed"
        dir="rtl"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSelStart(null);
        }}
        onSelect={(e) => {
          const el = e.currentTarget;
          setSelStart(el.selectionStart);
        }}
        onBlur={(e) => {
          setSelStart(e.currentTarget.selectionStart);
        }}
        placeholder={"أهلاً {name} 👋\n\n...اكتب رسالتك هنا...\n\nتحياتنا"}
        aria-label="قالب الرسالة"
      />

      <p className="mb-1 mt-4 text-sm font-bold">معاينة حية</p>
      <div className="wa-frame" aria-live="polite">
        <div className="wa-frame-head">
          <span className="wa-avatar" aria-hidden>
            م
          </span>
          <div>
            <div className="wa-frame-title">رسالة لمراقب</div>
            <div className="wa-frame-sub">بالشكل اللي هتظهر في WhatsApp</div>
          </div>
        </div>
        <div className="wa-body">
          <div className="wa-msg">
            {preview.hasPlaceholder ? (
              renderTemplate(value)
            ) : value ? (
              value
            ) : (
              <span className="text-muted">
                اكتب القالب ليظهر المعاينة هنا — هيبقي بالشكل اللي هيوصّل
                للمراقب.
              </span>
            )}
            <span className="wa-time">الآن</span>
          </div>
        </div>
      </div>

      {!preview.hasPlaceholder && value && (
        <p className="mb-0 mt-2 text-xs text-muted">
          لم يُستخدم {`{name}`} في القالب — كل المراقبين هيستلموا نفس الرسالة بدون
          أسمائهم.
        </p>
      )}
    </div>
  );
}

function previewText(value: string): { hasPlaceholder: boolean } {
  return { hasPlaceholder: value.includes(NAME_PLACEHOLDER) };
}

function renderTemplate(value: string) {
  return value.split(NAME_PLACEHOLDER).flatMap((part, index) =>
    index === 0
      ? [part]
      : [
          <span key={`name-${index}`} className="ph">
            اسم المراقب — {`{name}`}
          </span>,
          part,
        ],
  );
}