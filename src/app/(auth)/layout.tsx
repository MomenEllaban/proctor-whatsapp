export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-shell">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}