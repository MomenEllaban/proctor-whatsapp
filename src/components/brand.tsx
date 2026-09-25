/**
 * Generic product mark: a white chat bubble with a confirmation check on a
 * neutral slate gradient. No institution-specific branding.
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="شعار النظام"
      className="brand-mark"
    >
      <defs>
        <linearGradient id="app-mark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f4a63" />
          <stop offset="1" stopColor="#16273a" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#app-mark)" />
      <rect
        x="1.4"
        y="1.4"
        width="29.2"
        height="29.2"
        rx="7.8"
        fill="none"
        stroke="#5d7d9c"
        strokeWidth="1.1"
        opacity="0.8"
      />
      <path
        d="M16 7.4c-5.4 0-9.6 3.4-9.6 7.7 0 2.4 1.3 4.5 3.4 5.9l-.9 3.4 3.6-1.8c1.1.3 2.3.4 3.5.4 5.4 0 9.6-3.4 9.6-7.7S21.4 7.4 16 7.4Z"
        fill="#ffffff"
        opacity="0.96"
      />
      <path
        d="M11.6 15.3 14.6 18.3 20.6 12.2"
        fill="none"
        stroke="#16273a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark + product name, used in the app header and the sign-in screen. */
export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup">
      <BrandMark size={compact ? 36 : 44} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold leading-tight">
          نظام إدارة ومتابعة المراقبين
        </span>
        <span className="block truncate text-[0.7rem] font-semibold leading-tight opacity-80">
          قوائم ومتابعة واتساب
        </span>
      </span>
    </span>
  );
}
