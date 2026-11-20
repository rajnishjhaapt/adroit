import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { Show, UserButton, SignOutButton } from "@clerk/react";
import { LayoutDashboard, Inbox, Layers, FileText, UserCog, Loader2, ExternalLink } from "lucide-react";
import { useAdminApi } from "@/admin/common";
import { errMsg } from "@/lib/api";

const LINKS = [
  ["/admin", "Overview", LayoutDashboard, ["admin", "staff"]],
  ["/admin/enquiries", "Enquiries", Inbox, ["admin", "staff"]],
  ["/admin/services", "Services", Layers, ["admin"]],
  ["/admin/content", "Website Content", FileText, ["admin"]],
  ["/admin/users", "Staff & Access", UserCog, ["admin"]],
];

const Pending = ({ member }) => (
  <div className="flex min-h-screen items-center justify-center bg-mist p-6" data-testid="admin-pending">
    <div className="max-w-md border border-slate-200 bg-white p-10 text-center">
      <div className="flex justify-center"><UserButton /></div>
      <h1 className="mt-6 text-3xl font-semibold">Awaiting approval</h1>
      <p className="mt-4 text-sm text-slatey">Your account ({member.email}) has been created. An administrator needs to grant you access before you can use the dashboard.</p>
      <div className="mt-8 flex justify-center gap-3">
        <a href="/" className="btn-outline-navy" data-testid="pending-back-to-site">Back to website</a>
        <SignOutButton><button className="btn-navy" data-testid="pending-sign-out">Sign out</button></SignOutButton>
      </div>
    </div>
  </div>
);

function Shell() {
  const call = useAdminApi();
  const [member, setMember] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    call("get", "/me").then(setMember).catch((e) => setError(errMsg(e)));
  }, [call]);

  if (error) return <p className="p-10 text-red-600" data-testid="admin-error">{error}</p>;
  if (!member) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>;
  if (member.role === "pending") return <Pending member={member} />;

  const links = LINKS.filter((l) => l[3].includes(member.role));
  return (
    <div className="min-h-screen bg-mist lg:flex" data-testid="admin-shell">
      <aside className="bg-navy text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="font-serif text-xl text-white">Adroit Admin</p>
            <p className="text-xs uppercase tracking-[0.2em] text-gold" data-testid="admin-role-badge">{member.role}</p>
          </div>
          <UserButton />
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
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10"><Outlet context={{ member }} /></main>
    </div>
  );
}

export default function AdminGate() {
  return (
    <>
      <Show when="signed-in"><Shell /></Show>
      <Show when="signed-out"><Navigate to="/sign-in" replace /></Show>
    </>
  );
}
