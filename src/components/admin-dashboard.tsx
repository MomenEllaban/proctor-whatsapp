"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patch } from "@/lib/client-api";
import { ROLE_LABELS, USER_ROLES, type AdminOverview, type UserRole } from "@/lib/types";

/** Admin-only screen: platform stats, user roles, and every list. */
export function AdminDashboard({
  overview,
  currentUserId,
  currentUserEmail,
}: {
  overview: AdminOverview;
  currentUserId: string;
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(overview.users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const changeRole = async (id: string, role: UserRole) => {
    setError("");
    setBusyId(id);
    const res = await patch(`/api/admin/users/${encodeURIComponent(id)}`, { role });
    setBusyId(null);
    if (!res.ok) return setError(res.error ?? "تعذر حفظ الدور");
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    router.refresh();
  };

  const stats = [
    { label: "حسابات النظام", value: overview.stats.users, hint: "كلهم @horus.edu.eg" },
    { label: "القوائم", value: overview.stats.lists, hint: "امتحانات ولجان" },
    { label: "المراقبون", value: overview.stats.proctors, hint: "أرقام وهمية للتجربة" },
    { label: "تم فتح واتساب", value: overview.stats.opened, hint: "من كل القوائم" },
  ];

  return (
    <div>
      <header className="page-head">
        <div className="min-w-0">
          <h1 className="m-0 text-xl font-extrabold">لوحة التحكم</h1>
          <p className="m-0 text-sm text-muted">
            إشراف كامل على الحسابات والقوائم — بيانات تجريبية وهمية فقط.
          </p>
        </div>
        <span className="role-chip role-chip-admin">أدمن</span>
      </header>

      <section className="admin-stats" aria-label="إحصائيات النظام">
        {stats.map((s) => (
          <div key={s.label} className="admin-stat">
            <b>{s.value}</b>
            <span>{s.label}</span>
            <small>{s.hint}</small>
          </div>
        ))}
      </section>

      {error && (
        <p role="alert" className="field-error m-0 mb-3">
          {error}
        </p>
      )}

      <section className="card" aria-labelledby="admin-users">
        <h2 id="admin-users" className="mb-1 text-base font-extrabold">
          الحسابات والصلاحيات
        </h2>
        <p className="m-0 mb-3 text-xs text-muted">
          الأدمن يشوف كل حاجة، المشرف بيدير، والمستخدم بيدير قوائمه بس.
        </p>
        <ul className="admin-rows">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <li key={u.id} className="admin-row">
                <div className="min-w-0">
                  <p className="m-0 truncate font-bold">
                    {u.display_name ?? "مستخدم"}
                    {isSelf && <span className="badge">أنت</span>}
                  </p>
                  <p className="m-0 truncate text-xs text-muted" dir="ltr">
                    {u.email}
                  </p>
                  <p className="m-0 text-xs text-muted">
                    {u.listCount} قائمة · {u.proctorCount} مراقب · {u.openedCount} فتح
                  </p>
                </div>
                <label className="sr-only" htmlFor={`role-${u.id}`}>
                  دور {u.display_name ?? u.email}
                </label>
                <select
                  id={`role-${u.id}`}
                  className="input admin-role-select"
                  value={u.role}
                  disabled={busyId === u.id}
                  onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                >
                  {USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card" aria-labelledby="admin-lists">
        <h2 id="admin-lists" className="mb-1 text-base font-extrabold">
          كل القوائم
        </h2>
        <p className="m-0 mb-3 text-xs text-muted">مالك القائمة وحالتها.</p>
        <ul className="admin-rows">
          {overview.lists.map((l) => (
            <li key={l.id} className="admin-row">
              <div className="min-w-0">
                <p className="m-0 truncate font-bold">{l.title}</p>
                <p className="m-0 truncate text-xs text-muted">
                  {l.owner_name} · {l.owner_email}
                </p>
                <p className="m-0 text-xs text-muted">
                  {l.proctorCount} مراقب · تم فتح {l.openedCount}
                </p>
              </div>
              <span className="role-chip">
                {l.openedCount}/{l.proctorCount}
              </span>
            </li>
          ))}
          {overview.lists.length === 0 && (
            <li className="admin-row text-muted">لا توجد قوائم بعد.</li>
          )}
        </ul>
      </section>

      <p className="admin-note">
        تسجيل الدخول بحسابك: <span dir="ltr">{currentUserEmail}</span> · أي داتا
        في هذه اللوحة أمثلة وهمية للتجربة فقط.
      </p>
    </div>
  );
}
