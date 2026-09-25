import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/data";
import { AppHeader } from "@/components/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <AppHeader
        userEmail={user.email}
        userName={user.displayName}
        role={user.role}
      />
      <main className="app-main">{children}</main>
    </div>
  );
}