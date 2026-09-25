import { isDemo, env } from "@/lib/env";
import { loadDb } from "@/lib/data/demoStore";
import LoginForm from "@/components/login-form";
import { isUserRole, type UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تسجيل الدخول",
};

export default async function LoginPage() {
  const demoAccounts: { email: string; name: string; role: UserRole }[] =
    isDemo
      ? (await loadDb())
          .users.slice()
          .sort((a, b) => {
            const weight = (role: unknown) =>
              role === "admin" ? 0 : role === "supervisor" ? 1 : 2;
            return (
              weight(a.role) - weight(b.role) ||
              a.created_at.localeCompare(b.created_at)
            );
          })
          .map((u) => ({
            email: u.email,
            name: u.display_name || "مستخدم",
            role: isUserRole(u.role) ? u.role : "user",
          }))
      : [];

  return (
    <LoginForm
      demoAccounts={demoAccounts}
      demoPassword={isDemo ? env.demoPassword : null}
      allowedDomains={env.allowedEmailDomains}
    />
  );
}
