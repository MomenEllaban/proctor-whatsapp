import { redirect } from "next/navigation";
import { getSessionUser, listLists, getProctors } from "@/lib/data";
import {
  ListsDashboard,
  type ListSummary,
} from "@/components/lists-dashboard";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const lists = await listLists(user);
  const summaries: ListSummary[] = await Promise.all(
    lists.map(async (l) => {
      const proctors = await getProctors(user, l.id);
      return {
        id: l.id,
        title: l.title,
        message_template: l.message_template,
        proctorCount: proctors.length,
        openedCount: proctors.filter((p) => p.opened_at).length,
        created_at: l.created_at,
      };
    }),
  );

  return <ListsDashboard lists={summaries} userName={user.displayName ?? ""} />;
}