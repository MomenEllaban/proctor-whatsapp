"use client";

import { useState } from "react";
import { post } from "@/lib/client-api";
import { useHydrated } from "@/lib/use-hydrated";
import {
  autoExamDate,
  buildMessageTemplate,
  DEFAULT_MESSAGE_TEMPLATE,
  defaultMessageTemplate,
  detectMessageStyle,
  EXAM_OPTIONS,
  formatExamDate,
  MESSAGE_STYLE_LABELS,
  MESSAGE_STYLES,
  NAME_PLACEHOLDER,
  parseMessageTemplate,
  resolveExamRound,
  validateMessageVariables,
  type MessageStyle,
  type MessageVariableKey,
  type MessageVariables,
} from "@/lib/message";

/**
 * Structured editor: the message is always ready, and the user only fills the
 * few variable values. The final text is rebuilt from those values on every edit.
 */
export function TemplateEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [style, setStyle] = useState<MessageStyle>(() =>
    detectMessageStyle(value),
  );
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const variables = parseMessageTemplate(value);
  const errors = validateMessageVariables(variables);
  const errorCount = Object.keys(errors).length;
  const examSelection = EXAM_OPTIONS.some(
    (option) => option === variables.exam,
  )
    ? variables.exam
    : "custom";
  const hasChanges = value !== DEFAULT_MESSAGE_TEMPLATE;

  // The automatic date depends on today's calendar day, so it is only read
  // after hydration to keep the server and client markup identical.
  const hydrated = useHydrated();
  const autoDate = hydrated ? autoExamDate(variables.exam) : null;
  const dateIsAuto = !!autoDate && variables.examDate.trim() === autoDate;
  const suggestedDate = autoDate && !dateIsAuto ? autoDate : null;
  const round = hydrated ? resolveExamRound() : null;

  const updateVariable = (
    key: MessageVariableKey,
    nextValue: string,
  ): void => {
    const next: MessageVariables = { ...variables, [key]: nextValue };
    if (key === "exam") {
      const auto = nextValue.trim() ? autoExamDate(nextValue) : null;
      if (auto) next.examDate = auto;
    }
    onChange(buildMessageTemplate(next, style));
  };

  const changeStyle = (next: MessageStyle): void => {
    setStyle(next);
    setAiNote("");
    onChange(buildMessageTemplate(variables, next));
  };

  const askAi = async () => {
    if (errorCount > 0 || aiBusy) return;
    setAiBusy(true);
    setAiNote("");
    const res = await post<{ message?: string; source?: string }>(
      "/api/ai/message",
      { style, variables },
    );
    setAiBusy(false);
    if (!res.ok || !res.data?.message) {
      setAiNote(res.error ?? "تعذر تشغيل المساعد — القالب الحالي زي ما هو.");
      return;
    }
    onChange(res.data.message);
    setAiNote(
      res.data.source === "gemini"
        ? "✨ صياغة بالذكاء الاصطناعي — راجع المعاينة قبل الحفظ."
        : "✨ صياغة جاهزة من القوالب الرسمية (أضف GEMINI_API_KEY لصياغة بالذكاء الاصطناعي).",
    );
  };

  return (
    <div className="template-builder">
      <div className="template-intro">
        <div className="min-w-0">
          <p className="template-intro-title">✅ القالب جاهز — غيّر المتغيرات فقط</p>
          <p className="template-help">
            باقي الجمل ثابتة، واسم المراقب بيتكتب لوحده مع كل رقم.
          </p>
        </div>
        <button
          type="button"
          className="chip"
          onClick={() => {
            setStyle("formal");
            setAiNote("");
            onChange(defaultMessageTemplate());
          }}
          disabled={!hasChanges}
        >
          ↺ استعادة الافتراضي
        </button>
      </div>

      <div className="ai-panel">
        <span className="ai-label">🤖 أسلوب الصياغة</span>
        <span className="ai-style" role="group" aria-label="أسلوب الصياغة">
          {MESSAGE_STYLES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={style === option}
              onClick={() => changeStyle(option)}
            >
              {MESSAGE_STYLE_LABELS[option]}
            </button>
          ))}
        </span>
        <button
          type="button"
          className="chip"
          onClick={askAi}
          disabled={aiBusy || errorCount > 0}
        >
          {aiBusy ? "جاري الصياغة..." : "✨ اكتب بالذكاء الاصطناعي"}
        </button>
        {aiNote && <p className="ai-note">{aiNote}</p>}
      </div>

      <div className="template-auto">
        <div className="template-label">
          <span>التحية واسم المراقب</span>
          <span className="auto-tag">تلقائي</span>
        </div>
        <p className="template-auto-text" dir="rtl">
          السلام عليكم ورحمة الله وبركاته، أهلاً{" "}
          <span className="ph">اسم المراقب</span>
        </p>
        <p className="template-help">
          الاسم ده بيجيب من قائمة المراقبين — مش محتاج تكتبه يدوي.
        </p>
      </div>

      <div className="template-fields">
        <div className="template-field">
          <label className="template-label" htmlFor="template-exam">
            <span>امتحان الجروب</span>
            <span className="variable-tag">متغير</span>
          </label>
          <select
            id="template-exam"
            className="input template-select"
            value={examSelection}
            onChange={(event) =>
              updateVariable(
                "exam",
                event.target.value === "custom" ? "" : event.target.value,
              )
            }
            aria-invalid={!!errors.exam}
            aria-describedby="template-exam-help"
          >
            {EXAM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value="custom">امتحان آخر…</option>
          </select>
          <p id="template-exam-help" className="template-help">
            اختر الامتحان — تاريخ الامتحان هيتكتب لوحده من الجدول.
          </p>
          {errors.exam && (
            <p role="alert" className="field-error">
              {errors.exam}
            </p>
          )}
          {examSelection === "custom" && (
            <div className="template-custom">
              <label className="template-help" htmlFor="template-exam-custom">
                اسم الامتحان
              </label>
              <input
                id="template-exam-custom"
                className="input"
                value={variables.exam}
                onChange={(event) => updateVariable("exam", event.target.value)}
                placeholder="مثال: فيزياء 101"
                aria-invalid={!!errors.exam}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <div className="template-field">
          <label className="template-label" htmlFor="template-location">
            <span>مكان الامتحان</span>
            <span className="variable-tag">متغير</span>
          </label>
          <input
            id="template-location"
            className="input"
            value={variables.location}
            onChange={(event) => updateVariable("location", event.target.value)}
            placeholder="قاعة الامتحانات الرئيسية"
            aria-invalid={!!errors.location}
            autoComplete="off"
          />
          <p className="template-help">القاعة أو المكان اللي الامتحان فيه.</p>
          {errors.location && (
            <p role="alert" className="field-error">
              {errors.location}
            </p>
          )}
        </div>

        <div className="template-field">
          <label className="template-label" htmlFor="template-group-url">
            <span>رابط جروب WhatsApp</span>
            <span className="variable-tag">متغير</span>
          </label>
          <input
            id="template-group-url"
            className="input"
            type="url"
            dir="ltr"
            value={variables.groupUrl}
            onChange={(event) => updateVariable("groupUrl", event.target.value)}
            placeholder="https://chat.whatsapp.com/…"
            aria-invalid={!!errors.groupUrl}
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <p className="template-help">الصق رابط الدعوة من زرار مشاركة الجروب.</p>
          {errors.groupUrl && (
            <p role="alert" className="field-error">
              {errors.groupUrl}
            </p>
          )}
        </div>

        <div className="template-field">
          <label className="template-label" htmlFor="template-date">
            <span>موعد الامتحان</span>
            {dateIsAuto ? (
              <span className="auto-tag">تلقائي</span>
            ) : (
              <span className="variable-tag">متغير</span>
            )}
          </label>
          <input
            id="template-date"
            className="input"
            value={variables.examDate}
            onChange={(event) => updateVariable("examDate", event.target.value)}
            placeholder="يوم الجمعة الموافق 9 أكتوبر 2026"
            aria-invalid={!!errors.examDate}
            aria-describedby="template-date-help"
            autoComplete="off"
          />
          <p id="template-date-help" className="template-help">
            {autoDate
              ? "التاريخ ده اتكتب أوتوماتيك من جدول الامتحانات — تقدر تعدّله."
              : "اكتبه زي ما عايز يظهر في الرسالة."}
          </p>
          {round && (
            <p className="template-help">
              الدورة الحالية: EST1 = {formatExamDate(round.est1)} · EST2 ={" "}
              {formatExamDate(round.est2)}
            </p>
          )}
          {suggestedDate && (
            <button
              type="button"
              className="chip"
              onClick={() => updateVariable("examDate", suggestedDate)}
            >
              ↻ استخدم {suggestedDate}
            </button>
          )}
          {errors.examDate && (
            <p role="alert" className="field-error">
              {errors.examDate}
            </p>
          )}
        </div>
      </div>

      <div className="template-preview-head">
        <div>
          <p className="template-preview-title">معاينة حية</p>
          <p className="template-help">الشكل النهائي اللي هيوصل لكل مراقب.</p>
        </div>
        <span
          className={
            errorCount > 0 ? "preview-state preview-state-warn" : "preview-state"
          }
        >
          {errorCount > 0 ? "تحتاج مراجعة" : "جاهزة"}
        </span>
      </div>

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
            {renderTemplate(value)}
            <span className="wa-time">الآن</span>
          </div>
        </div>
      </div>

      {errorCount > 0 && (
        <p role="alert" className="template-warning">
          ⚠️ اكمل الحقول المميزة بالأحمر قبل الحفظ.
        </p>
      )}

      <p className="template-footnote">
        التطبيق بيفتح واتساب والرسالة مكتوبة مسبقًا — الإرسال بتمسه إنت بنفسك.
      </p>
    </div>
  );
}

function renderTemplate(value: string) {
  if (!value.includes(NAME_PLACEHOLDER)) return value;
  return value.split(NAME_PLACEHOLDER).flatMap((part, index) =>
    index === 0
      ? [part]
      : [
          <span key={`name-${index}`} className="ph">
            اسم المراقب
          </span>,
          part,
        ],
  );
}
