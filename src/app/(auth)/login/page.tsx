import { isDemo, env } from "@/lib/env";
import { loadDb } from "@/lib/data/demoStore";
import LoginForm from "@/components/login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تسجيل الدخول",
};

export default function LoginPage() {
  const demoAccounts = isDemo
    ? loadDb()
        .users.sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((u) => ({ email: u.email, name: u.display_name || "" }))
    : [];
  return (
    <LoginForm
      demoAccounts={demoAccounts}
      demoPassword={isDemo ? env.demoPassword : null}
    />
  );
}