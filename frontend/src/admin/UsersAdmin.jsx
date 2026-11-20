import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAdminApi, fmtDate } from "@/admin/common";
import { errMsg } from "@/lib/api";

const LABEL = { admin: "Admin", staff: "Staff", pending: "Pending approval" };

export default function UsersAdmin() {
  const call = useAdminApi();
  const [data, setData] = useState({ roles: [], users: [] });
  const load = useCallback(() => call("get", "/users").then(setData), [call]);
  useEffect(() => {
    load();
  }, [load]);

  const change = async (u, role) => {
    try { await call("patch", `/users/${u.user_id}/role`, { role }); toast.success("Access updated"); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid="admin-users">
      <h1 className="text-4xl font-semibold">Staff & Access</h1>
      <p className="mt-2 max-w-2xl text-sm text-slatey">
        Team members create their own account on the staff sign-up page. New accounts start as “Pending approval” and cannot see any data until you set them to Staff or Admin. Staff see only enquiries assigned to them.
      </p>
      <div className="mt-8 overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-navy text-xs uppercase tracking-wider text-white/80">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Access</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.users.map((u) => (
              <tr key={u.user_id} data-testid={`user-row-${u.email}`}>
                <td className="px-4 py-3 font-medium text-navy">{u.name || "-"}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 text-xs text-slatey">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <select className="field py-2" value={u.role} onChange={(e) => change(u, e.target.value)} data-testid={`user-role-select-${u.email}`}>
                    {data.roles.map((r) => <option key={r} value={r}>{LABEL[r] || r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
