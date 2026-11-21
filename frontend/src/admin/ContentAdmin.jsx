import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminApi } from "@/admin/common";
import { useSite } from "@/lib/site";
import { errMsg } from "@/lib/api";

const lines = (v) => v.split("\n").map((s) => s.trim()).filter(Boolean);

const Card = ({ title, children }) => (
  <section className="border border-slate-200 bg-white p-6">
    <h2 className="text-2xl font-semibold">{title}</h2>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
  </section>
);

const L = ({ label, full, children }) => (
  <label className={`block ${full ? "sm:col-span-2" : ""}`}>
    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-navy">{label}</span>{children}
  </label>
);

export default function ContentAdmin() {
  const call = useAdminApi();
  const { content, reload } = useSite();
  const [f, setF] = useState(() => ({ ...content, about_intro: content.about_intro.join("\n\n"),
    partners: content.partners.map((p) => ({ ...p, bio: p.bio.join("\n\n") })), core_values: content.core_values || [],
    vision: content.vision || "", mission: content.mission || "",
    firms: content.firms.map((x) => ({ name: x.name, members: x.members.join("\n") })) }));
  const [busy, setBusy] = useState(false);
  const inp = (k, props = {}) => <input className="field" value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} data-testid={`content-${k}`} {...props} />;
  const area = (k, rows = 3) => <textarea className="field" rows={rows} value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} data-testid={`content-${k}`} />;
  const upd = (key, i, k, v) => setF((p) => ({ ...p, [key]: p[key].map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  const paras = (v) => v.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const save = async () => {
    setBusy(true);
    const body = { ...f, about_intro: paras(f.about_intro),
      partners: f.partners.filter((x) => x.name.trim()).map((x) => ({ ...x, name: x.name.trim(), bio: paras(x.bio) })),
      core_values: f.core_values.filter((x) => x.title.trim()),
      firms: f.firms.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), members: lines(x.members) })) };
    try { await call("put", "/admin/content", body); await reload(); toast.success("Website content saved"); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6" data-testid="admin-content">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold">Website Content</h1>
        <button className="btn-gold" onClick={save} disabled={busy} data-testid="content-save-btn">Save Changes</button>
      </div>
      <Card title="Company & Contact">
        <L label="Company name">{inp("company_name")}</L>
        <L label="Experience (shown as “X Years of Experience”)">{inp("experience")}</L>
        <L label="Tagline" full>{inp("tagline")}</L>
        <L label="Address" full>{inp("address")}</L>
        <L label="Second office address (leave empty to hide)" full>{inp("address_2")}</L>
        <L label="Phone (display)">{inp("phone")}</L>
        <L label="Phone (for call link, digits with +)">{inp("phone_link")}</L>
        <L label="WhatsApp number (digits only, with country code)">{inp("whatsapp_number")}</L>
      </Card>
      <Card title="Homepage">
        <L label="Hero headline" full>{inp("hero_headline")}</L>
        <L label="Hero supporting text" full>{area("hero_text")}</L>
        <L label="Consultation CTA headline" full>{inp("cta_headline")}</L>
        <L label="Services intro" full>{area("services_intro", 2)}</L>
        <div className="space-y-3 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wider text-navy">Why Choose Us</p>
          {f.why_choose.map((w, i) => (
            <div key={i} className="grid gap-2 border border-slate-200 p-3 sm:grid-cols-[1fr_2fr_auto]">
              <input className="field" value={w.title} onChange={(e) => upd("why_choose", i, "title", e.target.value)} data-testid={`content-why-title-${i}`} />
              <input className="field" value={w.text} onChange={(e) => upd("why_choose", i, "text", e.target.value)} />
              <button className="p-2 text-red-700" onClick={() => setF((p) => ({ ...p, why_choose: p.why_choose.filter((_, j) => j !== i) }))} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button className="btn-outline-navy px-3 py-2" onClick={() => setF((p) => ({ ...p, why_choose: [...p.why_choose, { title: "", text: "" }] }))}><Plus className="h-4 w-4" />Add item</button>
        </div>
      </Card>
      <Card title="About Us">
        <L label="Introduction (separate paragraphs with a blank line)" full>{area("about_intro", 6)}</L>
        <L label="Professional approach" full>{area("about_approach", 4)}</L>
        <L label="Commitment to client service" full>{area("about_commitment", 4)}</L>
        <L label="Our Vision" full>{area("vision", 4)}</L>
        <L label="Our Mission" full>{area("mission", 4)}</L>
        <div className="space-y-3 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wider text-navy">Core Values</p>
          {f.core_values.map((w, i) => (
            <div key={i} className="grid gap-2 border border-slate-200 p-3 sm:grid-cols-[1fr_2fr_auto]">
              <input className="field" value={w.title} onChange={(e) => upd("core_values", i, "title", e.target.value)} data-testid={`content-value-title-${i}`} />
              <input className="field" value={w.text} onChange={(e) => upd("core_values", i, "text", e.target.value)} />
              <button className="p-2 text-red-700" onClick={() => setF((p) => ({ ...p, core_values: p.core_values.filter((_, j) => j !== i) }))} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button className="btn-outline-navy px-3 py-2" onClick={() => setF((p) => ({ ...p, core_values: [...p.core_values, { title: "", text: "" }] }))}><Plus className="h-4 w-4" />Add value</button>
        </div>
      </Card>
      <Card title="Team">
        <div className="space-y-3 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wider text-navy">Partners of Adroit</p>
          {f.partners.map((x, i) => (
            <div key={i} className="grid gap-2 border border-slate-200 p-3 sm:grid-cols-2" data-testid={`content-partner-${i}`}>
              <input className="field" placeholder="Name" value={x.name} onChange={(e) => upd("partners", i, "name", e.target.value)} data-testid={`content-partner-name-${i}`} />
              <input className="field" placeholder="Designation" value={x.designation} onChange={(e) => upd("partners", i, "designation", e.target.value)} />
              <textarea className="field sm:col-span-2" rows={2} placeholder="Quote" value={x.quote} onChange={(e) => upd("partners", i, "quote", e.target.value)} data-testid={`content-partner-quote-${i}`} />
              <textarea className="field sm:col-span-2" rows={5} placeholder="Profile description (separate paragraphs with a blank line)" value={x.bio} onChange={(e) => upd("partners", i, "bio", e.target.value)} />
              <input className="field" placeholder="Photo URL (https://…) – leave empty to show initials" value={x.photo_url} onChange={(e) => upd("partners", i, "photo_url", e.target.value)} data-testid={`content-partner-photo-${i}`} />
              <input className="field" placeholder="Full-size portrait URL for profile page (optional)" value={x.portrait_url || ""} onChange={(e) => upd("partners", i, "portrait_url", e.target.value)} data-testid={`content-partner-portrait-${i}`} />
              <button className="justify-self-end p-2 text-red-700" onClick={() => setF((p) => ({ ...p, partners: p.partners.filter((_, j) => j !== i) }))} aria-label="Remove partner"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button className="btn-outline-navy px-3 py-2" onClick={() => setF((p) => ({ ...p, partners: [...p.partners, { slug: "", name: "", designation: "Partner – Adroit Management and Tax Consultants", quote: "", bio: "", photo_url: "", portrait_url: "" }] }))} data-testid="content-add-partner"><Plus className="h-4 w-4" />Add partner</button>
        </div>
        <div className="space-y-3 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wider text-navy">Associated CA Firms</p>
          {f.firms.map((x, i) => (
            <div key={i} className="grid gap-2 border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]" data-testid={`content-firm-${i}`}>
              <input className="field" placeholder="Firm name" value={x.name} onChange={(e) => upd("firms", i, "name", e.target.value)} />
              <textarea className="field" rows={3} placeholder="Members, one per line" value={x.members} onChange={(e) => upd("firms", i, "members", e.target.value)} />
              <button className="p-2 text-red-700" onClick={() => setF((p) => ({ ...p, firms: p.firms.filter((_, j) => j !== i) }))} aria-label="Remove firm"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button className="btn-outline-navy px-3 py-2" onClick={() => setF((p) => ({ ...p, firms: [...p.firms, { name: "", members: "" }] }))} data-testid="content-add-firm"><Plus className="h-4 w-4" />Add firm</button>
        </div>
      </Card>
    </div>
  );
}
