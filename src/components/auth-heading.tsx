export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6 text-center">
      <span
        className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-head text-headink shadow-sm"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Z" />
        </svg>
      </span>
      <h1 className="m-0 text-xl font-extrabold">{title}</h1>
      <p className="m-0 text-sm text-muted">{subtitle}</p>
    </div>
  );
}
