import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAdminApi, STATUS, KIND, StatusBadge, fmtDate } from "@/admin/common";
import { errMsg } from "@/lib/api";

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wider text-slatey">{label}</p>
    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{value || "-"}</p>
  </div>
);

export const EnquiryDrawer = ({ id, member, onClose, onChanged }) => {
  const call = useAdminApi();
  const [e, setE] = useState(null);
  const [people, setPeople] = useState([]);
  const [note, setNote] = useState("");
  const isAdmin = member.role === "admin";

  useEffect(() => {
    setE(null);
    if (id) call("get", `/admin/enquiries/${id}`).then(setE).catch((err) => toast.error(errMsg(err)));
  }, [id, call]);

  useEffect(() => {
    if (isAdmin && id) call("get", "/admin/assignees").then(setPeople);
  }, [isAdmin, id, call]);

  const patch = async (body) => {
    try {
      setE(await call("patch", `/admin/enquiries/${id}`, body));
      onChanged();
      toast.success("Enquiry updated");
    } catch (err) { toast.error(errMsg(err)); }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      setE(await call("post", `/admin/enquiries/${id}/notes`, { text: note }));
      setNote("");
      toast.success("Note added");
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl" data-testid="enquiry-drawer">
        <SheetTitle className="font-serif text-2xl text-navy">{e ? e.full_name : "Loading…"}</SheetTitle>
        {e && (
          <div className="mt-6 space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm" data-testid="drawer-reference">{e.reference}</span>
              <StatusBadge status={e.status} />
              <span className="text-xs text-slatey">{KIND[e.kind]}</span>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <Info label="Mobile" value={e.mobile} />
              <Info label="Email" value={e.email} />
              <Info label="Service" value={e.service} />
              <Info label="Received" value={fmtDate(e.created_at)} />
              {e.kind === "booking" && <Info label="Preferred Date" value={e.preferred_date} />}
              {e.kind === "booking" && <Info label="Preferred Time" value={e.preferred_time} />}
              <div className="col-span-2"><Info label="Message" value={e.message} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-slatey">Status</span>
                <select className="field" value={e.status} onChange={(ev) => patch({ status: ev.target.value })} data-testid="drawer-status-select">
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-slatey">Assigned to</span>
                {isAdmin ? (
                  <select className="field" value={e.assigned_to || ""} onChange={(ev) => patch({ assigned_to: ev.target.value })} data-testid="drawer-assign-select">
                    <option value="">Unassigned</option>
                    {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name} ({p.role})</option>)}
                  </select>
                ) : <p className="py-3 text-sm">{e.assigned_name || "-"}</p>}
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy">Internal Notes</p>
              <textarea className="field mt-2 min-h-[90px]" value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Add an internal note (visible to team only)" data-testid="drawer-note-input" />
              <button className="btn-navy mt-2" onClick={addNote} data-testid="drawer-add-note-btn">Add Note</button>
              <ul className="mt-4 space-y-3" data-testid="drawer-notes-list">
                {[...e.notes].reverse().map((n) => (
                  <li key={n.id} className="border-l-2 border-gold bg-mist px-4 py-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.text}</p>
                    <p className="mt-1 text-xs text-slatey">{n.by} · {fmtDate(n.at)}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy">History</p>
              <ol className="mt-3 space-y-2 border-l border-slate-200 pl-4" data-testid="drawer-history">
                {[...e.history].reverse().map((h, i) => (
                  <li key={i} className="text-sm"><span className="text-ink">{h.action}</span><span className="block text-xs text-slatey">{h.by} · {fmtDate(h.at)}</span></li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
