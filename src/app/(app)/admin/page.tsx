import { notFound, redirect } from "next/navigation";
import { getAdminOverview, getSessionUser } from "@/lib/data";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata = { title: "لوحة التحكم" };

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) notFound();
  // Not an admin: send them back to their own lists instead of a dead end.
  if (user.role !== "admin") redirect("/lists");

  const overview = await getAdminOverview();
  return (
    <AdminDashboard
      overview={overview}
      currentUserId={user.id}
      currentUserEmail={user.email}
    />
  );
}
