# 💬 Proctor WhatsApp — مراقبو الامتحانات

Multi-user web app for exam-accreditation staff: create proctor lists, store each proctor's
Egyptian phone number once, and open **a personalized pre-filled WhatsApp message for the
right proctor with one tap**. The app **never sends** anything automatically — it only opens
WhatsApp (on the phone) pre-filled with the message, and you press send.

تطبيق ويب متعدد المستخدمين لإدارة مراقبي الامتحانات: أنشئ قوائم، احفظ رقم كل مراقب مرة واحدة،
وافتح **رسالة WhatsApp جاهزة ومخصّصة باسم كل مراقب بضغطة واحدة**. التطبيق **لا يرسل** أي شيء
تلقائيًا — هو يفتح الWhatsApp فقط للشخص الصحيح بالرسالة الجاهزة، وأنت تضغط إرسال.

---

## 🇪🇬 العربية

### المميزات
- 🔐 حساب مستقل لكل مشرف (بياناته معزولة تمامًا عن غيره).
- 📇 إضافة المراقبين دفعة واحدة: **من صورة** (تصوير قائمة المراقبين + استخراج تلقائي بالذكاء الاصطناعي Claude، يدعم صور iPhone .HEIC) أو **نسخ/لصق** من Excel أو Word أو WhatsApp.
- 🔍 شاشة مراجعة قبل الحفظ: كل صف يظهر بحالته (صالح / رقم ناقص / مكرر) وبتصحيح صيغة الرقم تلقائيًا.
- ✉️ قالب رسالة واحد للقائمة مع متغير `{name}` + **معاينة حية** بشكل محادثة WhatsApp.
- 🟢 زر "فتح WhatsApp": يفتح المحادثة للمرافق المطلوب مباشرة (على الموبايل عبر `wa.me`، على الكمبيوتر عبر رابط الويب)، ومتابعة أرقام تم فتحها وReset.
- 📱 تصميم موبايل أول بالعربية (RTL) + وضع ليلي/نهاري + PWA قابل للتثبيت.
- 💾 وضعان: **ديمو محلي صفر إعدادات** (ملف JSON) أو **إنتاجي بـ Supabase** (PostgreSQL + Auth + RLS).

### التشغيل السريع (وضع الديمو)
```bash
npm install
npm run db:seed   # ينشئ 10 حسابات ديمو بقوائم جاهزة
npm run dev       # http://localhost:3000
```
افتح صفحة تسجيل الدخول — ستجد **أزرار "دخول سريع"** للحسابات التجريبية:

| الحساب | الاسم |
|---|---|
| demo@horus.edu.eg | مستخدم تجريبي (17 مراقب — قائمة EST1) |
| manager1@horus.edu.eg | أحمد السيد |
| manager2@horus.edu.eg | منى خالد |
| supervisor1@horus.edu.eg | محمد فتحي |
| supervisor2@horus.edu.eg | سارة إبراهيم |
| supervisor3@horus.edu.eg | عمر عبد الرحمن |
| staff1@horus.edu.eg | ياسمين محمود |
| staff2@horus.edu.eg | كريم حسن |
| staff3@horus.edu.eg | رنا عادل |
| staff4@horus.edu.eg | نور الدين سمير |

كل الحسابات تشترك في نفس كلمة المرور (المتغير `DEMO_PASSWORD`، الافتراضي `demo1234`).

### متغيرات البيئة (`.env` — انسخ من `.env.example`)
| المتغير | الوصف | الافتراضي |
|---|---|---|
| `DATA_PROVIDER` | `demo` للتجربة المحلية، `supabase` للإنتاج | `demo` |
| `SIGNUP_MODE` | `domain` (نطاقات فقط) / `invite` (كود دعوة) / `open` | `domain` |
| `ALLOWED_EMAIL_DOMAINS` | النطاقات المسموح بالتسجيل بها (مفصولة بفواصل) | `horus.edu.eg` |
| `INVITE_CODE` | كود الدعوة عند `SIGNUP_MODE=invite` | — |
| `DEMO_PASSWORD` | باسورد كل حسابات الديمو | `demo1234` |
| `NEXT_PUBLIC_SUPABASE_URL` | معرف مشروع Supabase | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | المفتاح العام للتطبيق | — |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح الخدمة (خدمة الإحصائيات/الحذف) | — |
| `ANTHROPIC_API_KEY` | مفتاح Claude لاستخراج الأسماء/الأرقام من الصور والنص | — |
| `ANTHROPIC_MODEL` | موديل Claude المستخدم | `claude-sonnet-4-5` |

### الإنتاجي بـ Supabase
1. أنشئ مشروعًا على [supabase.com](https://supabase.com) ونفّذ `supabase/schema.sql` في SQL Editor.
2. اضبط المتغيرات أعلاه واختر `DATA_PROVIDER=supabase`.
3. كل قائمة ومراقب مربوط بصاحبها، والقواعد (RLS) تمنع أي وصول من مستخدم آخر. أشغّل ملف المخطط يضيف تلقائيًا صف `profiles` لأي مستخدم جديد (trigger `handle_new_user`).

### النشر
- **Vercel:** اربط المستودع بمنصة Vercel أو استخدم CLI (`vercel deploy --prod`). بدون ضبط `DATA_PROVIDER=supabase` سيعمل بالديمو تلقائيًا (يُزرع من `src/lib/demo-seed.json` في `/tmp`).
- **GitHub:** المستودع عام جاهز للاستنساخ.

### الأمان والخصوصية
- لا يُخزَّن أي مفتاح في الكود — الكل عبر متغيرات البيئة.
- الصور المرفوعة للاستخراج تُرسل للنموذج عبر `base64` **ولا تُحفظ على أي قرص**.
- التطبيق لا يمتلك أي تكامل مع WhatsApp API — يفتح الرابط فقط، فما زال الإنسان هو من يضغط "إرسال".

---

## 🇬🇧 EN

### Features
- 🔐 Each supervisor has their own account; data is fully isolated per user.
- 📇 Bulk add proctors: **from a photo** (snap the proctors list → Claude AI extracts names/phones, HEIC supported) or **paste** text from Excel/Word/WhatsApp.
- 🔍 Review screen before saving: every row shows its status (valid / missing number / duplicate) with automatic phone-format fixing (Egyptian prefixes 010/011/012/015, Arabic & Persian digits, `0020`/`+20` handled).
- ✉️ One message template per list with a `{name}` variable + **live WhatsApp-style preview**.
- 🟢 "Open WhatsApp" button: opens the chat for that specific proctor (mobile `wa.me` / desktop web), with opened-tracking and reset.
- 📱 Mobile-first Arabic (RTL) UI, dark/light modes, installable PWA.
- 💾 Two modes: **zero-config local demo** (JSON file) or **production Supabase** (PostgreSQL + Auth + Row-Level Security).

### Quick start (demo mode)
```bash
npm install
npm run db:seed   # creates 10 demo accounts with ready lists
npm run dev       # http://localhost:3000
```
10 demo accounts (demo@horus.edu.eg, manager1…staff4@horus.edu.eg) with **one-tap quick-login
buttons** on the sign-in page; shared password from `DEMO_PASSWORD` (default `demo1234`).

### Environment variables
See `.env.example`. Table with all variables is in the Arabic section above.

### Tests
```bash
npm test          # 65 unit tests (phone normalization incl. all 17 sample students, message builder, parser, Arabic utils)
npm run build     # type-check + lint + production build (Turbopack)
```

### Security & privacy
- No secrets in code — everything via environment variables.
- Extraction images are sent to the model as `base64` and **never written to disk**.
- No WhatsApp API integration; the app only opens a pre-filled chat — a human always presses send.

---

Built with Next.js (App Router + Turbopack), React 19, Tailwind v4, TypeScript, Vitest,
Supabase, and Anthropic Claude.
# proctor-whatsapp
