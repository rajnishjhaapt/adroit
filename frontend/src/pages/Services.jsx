import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle, X, Info } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { useSite } from "@/lib/site";
import { waLink } from "@/lib/api";
import { Seo } from "@/components/site/Seo";
import { PageHero, ConsultCta } from "@/components/site/Blocks";
import { ServiceIcon } from "@/components/site/ServiceIcon";

const cbCls = "h-5 w-5 rounded-sm border-gold data-[state=checked]:bg-gold data-[state=checked]:text-navy";

export const buildSelectionMessage = (company, lines) =>
  `Hello ${company},\n\nI am interested in the following services:\n\n${lines.map((l) => `* ${l}`).join("\n")}\n\nPlease contact me to discuss these requirements.\n\nThank you.`;

const SelectionBar = ({ count, warn, onClear, onEnquire }) => (
  <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/40 bg-navy/95 text-white backdrop-blur-xl" data-testid="selection-bar">
    <div className="container-x flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        {warn && count === 0 ? (
          <p className="flex items-center gap-2 text-gold" data-testid="selection-warning"><Info className="h-4 w-4" />Please select at least one service to enquire on WhatsApp.</p>
        ) : (
          <p data-testid="selection-count"><span className="font-semibold text-gold">{count}</span> {count === 1 ? "item" : "items"} selected</p>
        )}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onClear} className="btn-outline-light flex-1 px-4 sm:flex-none" data-testid="clear-selection-btn"><X className="h-4 w-4" />Clear Selection</button>
        <button type="button" onClick={onEnquire} className="btn-wa flex-[2] sm:flex-none" data-testid="whatsapp-enquiry-btn"><MessageCircle className="h-4 w-4" />Enquire on WhatsApp</button>
      </div>
    </div>
  </div>
);

const CategoryItem = ({ s, i, sel, toggle }) => {
  const catKey = `c:${s.slug}`;
  const picked = s.sub_services.filter((_, j) => sel[`s:${s.slug}:${j}`]).length;
  return (
    <AccordionItem value={s.slug} className="border border-slate-200 bg-white data-[state=open]:border-gold/60" data-testid={`service-accordion-${s.slug}`}>
      <div className="flex items-center gap-4 px-5 md:px-7 [&>h3]:flex-1">
        <Checkbox checked={!!sel[catKey]} onCheckedChange={() => toggle(catKey)} className={cbCls} aria-label={`Select ${s.name}`} data-testid={`service-checkbox-${s.slug}`} />
        <AccordionTrigger className="flex-1 justify-between gap-4 py-6 text-left hover:no-underline" data-testid={`service-accordion-trigger-${s.slug}`}>
          <span className="flex flex-1 items-center gap-4">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center bg-navy text-gold sm:flex"><ServiceIcon name={s.icon} className="h-5 w-5" /></span>
            <span>
              <span className="block font-serif text-xl font-semibold text-navy md:text-2xl">
                <span className="mr-2 font-mono text-xs text-slatey">{String(i + 1).padStart(2, "0")}</span>{s.name}
              </span>
              <span className="mt-1 block font-sans text-sm font-normal text-slatey">{s.description}</span>
              {picked > 0 && <span className="mt-2 inline-block bg-gold-subtle px-2 py-0.5 font-sans text-xs text-gold-hover">{picked} sub-service{picked > 1 ? "s" : ""} selected</span>}
            </span>
          </span>
        </AccordionTrigger>
      </div>
      <AccordionContent className="border-t border-slate-100 px-5 pb-7 pt-5 md:px-7">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slatey">Sub-services</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {s.sub_services.map((sub, j) => {
            const k = `s:${s.slug}:${j}`;
            return (
              <li key={k}>
                <label className={`flex cursor-pointer items-center gap-3 border px-4 py-3 text-sm transition-colors ${sel[k] ? "border-gold bg-gold-subtle" : "border-slate-200 hover:border-gold/50"}`}>
                  <Checkbox checked={!!sel[k]} onCheckedChange={() => toggle(k)} className={cbCls} data-testid={`sub-service-checkbox-${s.slug}-${j}`} />
                  <span className="text-ink" data-testid={`sub-service-name-${s.slug}-${j}`}>{sub}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to={`/services/${s.slug}`} className="btn-outline-navy" data-testid={`service-details-link-${s.slug}`}>View Service Details <ArrowUpRight className="h-4 w-4" /></Link>
          <Link to={`/schedule-consultation?service=${encodeURIComponent(s.name)}`} className="btn-gold" data-testid={`service-cta-${s.slug}`}>{s.cta}</Link>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default function Services() {
  const { content: c, services } = useSite();
  const [sel, setSel] = useState({});
  const [warn, setWarn] = useState(false);
  const toggle = (k) => { setWarn(false); setSel((p) => { const n = { ...p }; if (n[k]) delete n[k]; else n[k] = true; return n; }); };

  const lines = useMemo(() => services.flatMap((s) => [
    ...(sel[`c:${s.slug}`] ? [s.name] : []),
    ...s.sub_services.filter((_, j) => sel[`s:${s.slug}:${j}`]),
  ]), [services, sel]);

  const enquire = () => {
    if (!lines.length) { setWarn(true); return; }
    window.open(waLink(c.whatsapp_number, buildSelectionMessage(c.company_name, lines)), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Seo title="Our Services – GST, Accounting, TDS, Incorporation & More" description="GST, accounting, company incorporation, PF & ESIC, business licences, tax appeals, notice management, TDS, business loan documentation, e-commerce reconciliation, audit & assurance and trust registration services." />
      <PageHero eyebrow="Our Services" title="Professional services across audit, taxation, accounting and compliance" text={c.services_intro} testId="services-hero" />
      <section className="bg-mist py-16 pb-40 md:py-24 md:pb-40" data-testid="services-accordion-section">
        <div className="container-x">
          <div className="mb-10 flex flex-col gap-2 border-l-2 border-gold bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-ink"><span className="font-semibold text-navy">Select services and sub-services</span> using the checkboxes, then tap “Enquire on WhatsApp” to send us your list.</p>
          </div>
          <Accordion type="multiple" className="space-y-4">
            {services.map((s, i) => <CategoryItem key={s.slug} s={s} i={i} sel={sel} toggle={toggle} />)}
          </Accordion>
        </div>
      </section>
      <ConsultCta />
      <SelectionBar count={lines.length} warn={warn} onClear={() => { setSel({}); setWarn(false); }} onEnquire={enquire} />
    </>
  );
}
