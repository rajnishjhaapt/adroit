import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Inbox, Layers, FileText, UserCog, Loader2, ExternalLink, LogOut, KeyRound } from "lucide-react";
import { ChangePasswordDialog } from "@/admin/ChangePassword";
import { api, errMsg } from "@/lib/api";

const LINKS = [
  ["/admin", "Overview", LayoutDashboard, ["admin", "staff"]],
  ["/admin/enquiries", "Enquiries", Inbox, ["admin", "staff"]],
  ["/admin/services", "Services", Layers, ["admin"]],
  ["/admin/content", "Website Content", FileText, ["admin"]],
  ["/admin/users", "Staff & Access", UserCog, ["admin"]],
];

function Shell() {
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [error, setError] = useState("");
  const [pwOpen, setPwOpen] = useState(false);

  const loaded = useRef(false);

  useEffect(() => {
    api.get("/auth/me").then((r) => { loaded.current = true; setMember(r.data); }).catch((e) => {
      if (e?.response?.status === 401) navigate("/admin/login", { replace: true, state: loaded.current ? { expired: true } : undefined });
      else setError(errMsg(e));
    });
  }, [navigate]);

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    navigate("/admin/login", { replace: true });
  };

  if (error) return <p className="p-10 text-red-600" data-testid="admin-error">{error}</p>;
  if (!member) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>;

  const links = LINKS.filter((l) => l[3].includes(member.role));
  return (
    <div className="min-h-screen bg-mist lg:flex" data-testid="admin-shell">
      <aside className="flex flex-col bg-navy text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="font-serif text-xl text-white">Adroit Admin</p>
          <p className="mt-1 truncate text-xs text-white/60" data-testid="admin-user-email">{member.email}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-gold" data-testid="admin-role-badge">{member.role}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col">
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === "/admin"} data-testid={`admin-nav-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className={({ isActive }) => `flex shrink-0 items-center gap-3 px-4 py-3 text-sm transition-colors ${isActive ? "bg-gold text-navy" : "text-white/80 hover:bg-white/5"}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-3 px-4 py-3 text-sm text-white/60 hover:text-gold" data-testid="admin-view-site">
            <ExternalLink className="h-4 w-4" />View Website
          </a>
          <button onClick={() => setPwOpen(true)} className="flex shrink-0 items-center gap-3 px-4 py-3 text-left text-sm text-white/60 hover:text-gold" data-testid="admin-change-password-btn">
            <KeyRound className="h-4 w-4" />Change Password
          </button>
          <button onClick={logout} className="flex shrink-0 items-center gap-3 px-4 py-3 text-left text-sm text-white/60 hover:text-gold" data-testid="admin-logout-btn">
            <LogOut className="h-4 w-4" />Log Out
          </button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10"><Outlet context={{ member }} /></main>
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

export default Shell;
