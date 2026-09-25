/**
 * Horus University brand mark: a falcon eye (symbol of Horus) inside a
 * navy shield with a gold rim. Pure SVG so it stays crisp everywhere.
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="شعار جامعة حورس"
      className="brand-mark"
    >
      <defs>
        <linearGradient id="hu-navy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b4d7a" />
          <stop offset="1" stopColor="#0d2a48" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#hu-navy)" />
      <rect
        x="1.4"
        y="1.4"
        width="29.2"
        height="29.2"
        rx="7.8"
        fill="none"
        stroke="#d8b04a"
        strokeWidth="1.1"
        opacity="0.85"
      />
      <path
        d="M6.4 19.2C9.4 13.8 12.8 11 16 11s6.6 2.8 9.6 8.2c-3 5.4-6.4 8.2-9.6 8.2s-6.6-2.8-9.6-8.2Z"
        fill="#ffffff"
        opacity="0.96"
      />
      <circle cx="16" cy="19.2" r="3.9" fill="#1b4d7a" />
      <circle cx="16" cy="19.2" r="1.7" fill="#d8b04a" />
      <path
        d="M6.6 11.4C9.6 7.4 12.8 5.2 16 5.2s6.4 2.2 9.4 6.2"
        fill="none"
        stroke="#d8b04a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark + institution name, used in the app header and the sign-in screen. */
export function BrandLockup({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <span className="brand-lockup">
      <BrandMark size={compact ? 36 : 44} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold leading-tight">
          نظام مراقبو الامتحانات
        </span>
        <span className="block truncate text-[0.7rem] font-semibold leading-tight opacity-80">
          جامعة حورس — كلية الهندسة
        </span>
      </span>
    </span>
  );
}
