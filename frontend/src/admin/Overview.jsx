import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import { useAdminApi, StatusBadge, KIND, fmtDate } from "@/admin/common";

const Stat = ({ label, value, icon: Icon, testId }) => (
  <div className="border border-slate-200 bg-white p-6" data-testid={testId}>
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slatey">{label}</p>
      <Icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
    </div>
    <p className="mt-4 font-serif text-5xl font-semibold text-navy">{value}</p>
  </div>
);

export default function Overview() {
  const call = useAdminApi();
  const [s, setS] = useState(null);

  useEffect(() => {
    call("get", "/admin/stats").then(setS);
  }, [call]);

  if (!s) return null;
  return (
    <div data-testid="admin-overview">
      <h1 className="text-4xl font-semibold">Dashboard Overview</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Enquiries" value={s.total} icon={Inbox} testId="stat-total" />
        <Stat label="New" value={s.new} icon={Sparkles} testId="stat-new" />
        <Stat label="In Progress" value={s.in_progress} icon={Clock} testId="stat-in-progress" />
        <Stat label="Completed" value={s.completed} icon={CheckCircle2} testId="stat-completed" />
      </div>
      <div className="mt-10 border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-2xl font-semibold">Recent Enquiries</h2>
          <Link to="/admin/enquiries" className="text-sm text-gold-hover hover:underline" data-testid="overview-view-all">View all</Link>
        </div>
        {s.recent.length === 0 && <p className="px-6 py-10 text-sm text-slatey">No enquiries yet.</p>}
        <ul className="divide-y divide-slate-100">
          {s.recent.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm" data-testid={`recent-enquiry-${e.reference}`}>
              <div>
                <p className="font-medium text-navy">{e.full_name} <span className="ml-2 font-mono text-xs text-slatey">{e.reference}</span></p>
                <p className="text-xs text-slatey">{KIND[e.kind]} · {e.service || "General"} · {fmtDate(e.created_at)}</p>
              </div>
              <StatusBadge status={e.status} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
