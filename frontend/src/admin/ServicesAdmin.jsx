import { useCallback, useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Pencil, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAdminApi } from "@/admin/common";
import { ServiceEditor } from "@/admin/ServiceEditor";
import { useSite } from "@/lib/site";
import { errMsg } from "@/lib/api";

export default function ServicesAdmin() {
  const call = useAdminApi();
  const { reload } = useSite();
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => call("get", "/admin/services").then(setList), [call]);
  useEffect(() => {
    load();
  }, [load]);
  const done = () => { load(); reload(); };

  const move = async (i, d) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setList(next);
    await call("post", "/admin/services/reorder", { slugs: next.map((s) => s.slug) });
    reload();
  };

  const togglePublish = async (s) => {
    try { await call("put", `/admin/services/${s.slug}`, { ...s, published: !s.published }); done(); toast.success(s.published ? "Service hidden" : "Service published"); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Remove "${s.name}"? It will no longer appear on the website.`)) return;
    try { await call("delete", `/admin/services/${s.slug}`); done(); toast.success("Service removed"); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid="admin-services">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Services</h1>
          <p className="mt-1 text-sm text-slatey">Edit categories, sub-services, CTA text, visibility and order.</p>
        </div>
        <button className="btn-gold" onClick={() => setEditing({})} data-testid="add-service-btn"><Plus className="h-4 w-4" />Add Service</button>
      </div>
      <ul className="mt-8 divide-y divide-slate-100 border border-slate-200 bg-white">
        {list.map((s, i) => (
          <li key={s.slug} className="flex flex-wrap items-center gap-4 px-5 py-4" data-testid={`admin-service-row-${s.slug}`}>
            <div className="flex flex-col">
              <button disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-slatey hover:text-navy disabled:opacity-30" aria-label="Move up" data-testid={`service-up-${s.slug}`}><ArrowUp className="h-4 w-4" /></button>
              <button disabled={i === list.length - 1} onClick={() => move(i, 1)} className="p-1 text-slatey hover:text-navy disabled:opacity-30" aria-label="Move down" data-testid={`service-down-${s.slug}`}><ArrowDown className="h-4 w-4" /></button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-navy">{s.name}</p>
              <p className="text-xs text-slatey">{s.sub_services.length} sub-services · {s.published ? "Published" : "Hidden"}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => togglePublish(s)} className="btn-outline-navy px-3 py-2" data-testid={`admin-service-toggle-${s.slug}`}>
                {s.published ? <><EyeOff className="h-4 w-4" />Hide</> : <><Eye className="h-4 w-4" />Publish</>}
              </button>
              <button onClick={() => setEditing(s)} className="btn-outline-navy px-3 py-2" data-testid={`admin-service-edit-${s.slug}`}><Pencil className="h-4 w-4" />Edit</button>
              <button onClick={() => remove(s)} className="btn px-3 py-2 text-red-700 hover:bg-red-50" aria-label="Remove" data-testid={`admin-service-delete-${s.slug}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ul>
      {editing && <ServiceEditor service={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); done(); }} />}
    </div>
  );
}
