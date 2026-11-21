import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, KeyRound } from "lucide-react";
import { useAdminApi, fmtDate } from "@/admin/common";
import { errMsg } from "@/lib/api";

const LABEL = { admin: "Admin", staff: "Staff", disabled: "Disabled" };
const blank = { name: "", email: "", password: "", role: "staff" };

const AddUser = ({ onAdded }) => {
  const call = useAdminApi();
  const [f, setF] = useState(blank);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const add = async (e) => {
    e.preventDefault();
    try { await call("post", "/users", f); toast.success("User added"); setF(blank); onAdded(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <form onSubmit={add} className="mt-8 grid gap-3 border border-slate-200 bg-white p-5 md:grid-cols-[1fr_1fr_1fr_140px_auto]" data-testid="add-user-form">
      <input className="field" placeholder="Full name" value={f.name} onChange={set("name")} data-testid="add-user-name" />
      <input className="field" type="email" placeholder="Email ID" value={f.email} onChange={set("email")} data-testid="add-user-email" />
      <input className="field" type="password" placeholder="Password (min. 10)" value={f.password} onChange={set("password")} autoComplete="new-password" data-testid="add-user-password" />
      <select className="field" value={f.role} onChange={set("role")} data-testid="add-user-role">
        <option value="staff">Staff</option><option value="admin">Admin</option>
      </select>
      <button className="btn-gold" data-testid="add-user-submit"><UserPlus className="h-4 w-4" />Add</button>
    </form>
  );
};

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

  const resetPw = async (u) => {
    const password = window.prompt(`Set a new password for ${u.email} (min. 10 characters)`);
    if (!password) return;
    try { await call("post", `/users/${u.user_id}/password`, { password }); toast.success("Password updated"); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid="admin-users">
      <h1 className="text-4xl font-semibold">Staff & Access</h1>
      <p className="mt-2 max-w-2xl text-sm text-slatey">
        The main administrator ({data.admin_email}) signs in with the credentials set on the server. Add team members here with their own email ID and password. Staff see only enquiries assigned to them; disabled users cannot sign in.
      </p>
      <AddUser onAdded={load} />
      <div className="mt-8 overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-navy text-xs uppercase tracking-wider text-white/80">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Added</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Password</th></tr>
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
                <td className="px-4 py-3">
                  <button className="btn-outline-navy px-3 py-2" onClick={() => resetPw(u)} data-testid={`user-reset-password-${u.email}`}>
                    <KeyRound className="h-4 w-4" />{u.has_password ? "Reset" : "Set password"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.users.length === 0 && <p className="px-6 py-8 text-center text-sm text-slatey" data-testid="users-empty">No team members added yet.</p>}
      </div>
    </div>
  );
}
