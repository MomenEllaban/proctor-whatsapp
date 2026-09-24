export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="mb-4 h-6 w-40 rounded bg-line" />
      <div className="card grid gap-3 sm:grid-cols-2">
        <div className="h-20 rounded-xl bg-bg" />
        <div className="h-20 rounded-xl bg-bg" />
      </div>
      <div className="card h-64 rounded-xl bg-bg" />
    </div>
  );
}
