import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAdminApi } from "@/admin/common";
import { ICONS } from "@/components/site/ServiceIcon";
import { errMsg } from "@/lib/api";

const lines = (v) => v.split("\n").map((s) => s.trim()).filter(Boolean);

const L = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-navy">{label}</span>
    {hint && <span className="mb-1 block text-xs text-slatey">{hint}</span>}
    {children}
  </label>
);

export const ServiceEditor = ({ service, onClose, onSaved }) => {
  const call = useAdminApi();
  const isNew = !service.slug;
  const [f, setF] = useState({
    name: service.name || "", description: service.description || "", icon: service.icon || "Briefcase",
    cta: service.cta || "Schedule a Consultation", intro: service.intro || "", published: service.published ?? true,
    sub_services: (service.sub_services || []).join("\n"), who_needs: (service.who_needs || []).join("\n"),
    process: (service.process || []).join("\n"), documents: (service.documents || []).join("\n"),
    faqs: service.faqs || [],
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const setFaq = (i, k, v) => setF((p) => ({ ...p, faqs: p.faqs.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  const save = async () => {
    setBusy(true);
    const body = { ...f, sub_services: lines(f.sub_services), who_needs: lines(f.who_needs), process: lines(f.process),
      documents: lines(f.documents), faqs: f.faqs.filter((x) => x.q.trim() && x.a.trim()) };
    try {
      await (isNew ? call("post", "/admin/services", body) : call("put", `/admin/services/${service.slug}`, body));
      toast.success("Service saved");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" data-testid="service-editor">
        <DialogTitle className="font-serif text-2xl text-navy">{isNew ? "Add Service" : `Edit ${service.name}`}</DialogTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Service name"><input className="field" value={f.name} onChange={set("name")} data-testid="editor-name" /></L>
          <L label="Icon">
            <select className="field" value={f.icon} onChange={set("icon")} data-testid="editor-icon">{Object.keys(ICONS).map((k) => <option key={k}>{k}</option>)}</select>
          </L>
          <div className="sm:col-span-2"><L label="Short description"><textarea className="field" rows={2} value={f.description} onChange={set("description")} data-testid="editor-description" /></L></div>
          <div className="sm:col-span-2"><L label="Consultation CTA text"><input className="field" value={f.cta} onChange={set("cta")} data-testid="editor-cta" /></L></div>
          <div className="sm:col-span-2"><L label="Sub-services" hint="One per line"><textarea className="field" rows={6} value={f.sub_services} onChange={set("sub_services")} data-testid="editor-subs" /></L></div>
          <div className="sm:col-span-2"><L label="Introduction"><textarea className="field" rows={3} value={f.intro} onChange={set("intro")} data-testid="editor-intro" /></L></div>
          <L label="Who may need it" hint="One per line"><textarea className="field" rows={4} value={f.who_needs} onChange={set("who_needs")} data-testid="editor-who" /></L>
          <L label="Process steps" hint="One per line"><textarea className="field" rows={4} value={f.process} onChange={set("process")} data-testid="editor-process" /></L>
          <div className="sm:col-span-2"><L label="Required documents" hint="Only add verified requirements. Leave empty to hide this section."><textarea className="field" rows={3} value={f.documents} onChange={set("documents")} data-testid="editor-documents" /></L></div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-navy">FAQs</p>
          {f.faqs.map((x, i) => (
            <div key={i} className="mt-3 grid gap-2 border border-slate-200 p-3">
              <input className="field" placeholder="Question" value={x.q} onChange={(e) => setFaq(i, "q", e.target.value)} data-testid={`editor-faq-q-${i}`} />
              <textarea className="field" rows={2} placeholder="Answer" value={x.a} onChange={(e) => setFaq(i, "a", e.target.value)} />
              <button className="justify-self-end text-xs text-red-700" onClick={() => setF((p) => ({ ...p, faqs: p.faqs.filter((_, j) => j !== i) }))}><Trash2 className="inline h-3 w-3" /> Remove</button>
            </div>
          ))}
          <button className="btn-outline-navy mt-3 px-3 py-2" onClick={() => setF((p) => ({ ...p, faqs: [...p.faqs, { q: "", a: "" }] }))} data-testid="editor-add-faq"><Plus className="h-4 w-4" />Add FAQ</button>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#C6A15B]" checked={f.published} onChange={set("published")} data-testid="editor-published" />Published on website</label>
        <div className="flex justify-end gap-3">
          <button className="btn-outline-navy" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={save} disabled={busy} data-testid="editor-save-btn">Save Service</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
