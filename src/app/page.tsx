import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/data";

export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? "/lists" : "/login");
}