import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminApi, StatusBadge, KIND, STATUS, fmtDate } from "@/admin/common";
import { EnquiryDrawer } from "@/admin/EnquiryDrawer";
import { errMsg } from "@/lib/api";

export default function Enquiries() {
  const { member } = useOutletContext();
  const call = useAdminApi();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [openId, setOpenId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    call("get", "/admin/enquiries", undefined, { params: { q, status, kind } }).then(setRows).catch((e) => toast.error(errMsg(e)));
  }, [call, q, status, kind]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const data = await call("get", "/admin/enquiries/export.csv", undefined, { params: { q, status, kind }, responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `adroit-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div data-testid="admin-enquiries">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Enquiries</h1>
          <p className="mt-1 text-sm text-slatey">{member.role === "admin" ? "All enquiries and bookings" : "Enquiries assigned to you"}</p>
        </div>
        <button className="btn-navy" onClick={exportCsv} disabled={exporting} data-testid="export-csv-btn">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Export CSV
        </button>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_200px_200px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slatey" />
          <input className="field pl-10" placeholder="Search name, mobile, email, reference or service" value={q} onChange={(e) => setQ(e.target.value)} data-testid="admin-enquiry-search-input" />
        </label>
        <select className="field" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="admin-status-filter-select">
          <option value="">All statuses</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value)} data-testid="admin-kind-filter-select">
          <option value="">All types</option>
          {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="mt-6 overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-navy text-xs uppercase tracking-wider text-white/80">
            <tr>{["Reference", "Name", "Mobile", "Type", "Service", "Received", "Assigned", "Status"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows?.map((e) => (
              <tr key={e.id} onClick={() => setOpenId(e.id)} className="cursor-pointer hover:bg-gold-subtle" data-testid={`enquiry-row-${e.reference}`}>
                <td className="px-4 py-3 font-mono text-xs">{e.reference}</td>
                <td className="px-4 py-3 font-medium text-navy">{e.full_name}</td>
                <td className="px-4 py-3">{e.mobile}</td>
                <td className="px-4 py-3">{KIND[e.kind]}</td>
                <td className="max-w-[220px] truncate px-4 py-3">{e.service || "-"}</td>
                <td className="px-4 py-3 text-xs text-slatey">{fmtDate(e.created_at)}</td>
                <td className="px-4 py-3 text-xs">{e.assigned_name || "-"}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && rows.length === 0 && <p className="px-6 py-10 text-center text-sm text-slatey" data-testid="enquiries-empty">No enquiries found.</p>}
      </div>
      <EnquiryDrawer id={openId} member={member} onClose={() => setOpenId(null)} onChanged={load} />
    </div>
  );
}
