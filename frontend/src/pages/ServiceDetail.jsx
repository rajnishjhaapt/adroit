import { Link, useParams } from "react-router-dom";
import { Check, MessageCircle, ArrowLeft } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSite } from "@/lib/site";
import { waLink, serviceWaText } from "@/lib/api";
import { Seo } from "@/components/site/Seo";
import { ServiceIcon } from "@/components/site/ServiceIcon";
import { SectionHead } from "@/components/site/Blocks";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import NotFound from "@/pages/NotFound";

const Hero = ({ s, c }) => (
  <section className="lattice bg-navy text-white" data-testid="service-detail-hero">
    <div className="container-x py-16 md:py-24">
      <Link to="/services" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-gold" data-testid="back-to-services"><ArrowLeft className="h-4 w-4" />All Services</Link>
      <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-start">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center border border-gold text-gold"><ServiceIcon name={s.icon} className="h-8 w-8" /></span>
        <div>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl" data-testid="service-detail-title">{s.name}</h1>
          <p className="mt-5 max-w-2xl text-base text-white/75 md:text-lg">{s.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={`/schedule-consultation?service=${encodeURIComponent(s.name)}`} className="btn-gold" data-testid="service-detail-cta-btn">{s.cta}</Link>
            <a href={waLink(c.whatsapp_number, serviceWaText(c.company_name, s.name))} target="_blank" rel="noopener noreferrer" className="btn-wa" data-testid="service-detail-whatsapp-btn">
              <MessageCircle className="h-4 w-4" />Enquire on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const ListBlock = ({ items, testId }) => (
  <ul className="mt-8 grid gap-3 sm:grid-cols-2" data-testid={testId}>
    {items.map((x) => (
      <li key={x} className="flex items-start gap-3 border border-slate-200 bg-white px-4 py-3 text-sm text-ink">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-hover" />{x}
      </li>
    ))}
  </ul>
);

export default function ServiceDetail() {
  const { slug } = useParams();
  const { content: c, services } = useSite();
  const s = services.find((x) => x.slug === slug);
  if (!s) return <NotFound />;
  return (
    <>
      <Seo title={s.name} description={`${s.description} ${c.company_name}, Noida.`} />
      <Hero s={s} c={c} />
      <section className="bg-white py-20 md:py-28">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <div className="space-y-20 lg:col-span-8">
            {s.intro && (
              <div data-testid="service-intro">
                <SectionHead eyebrow="Introduction" title={`About our ${s.name}`} />
                <p className="mt-8 text-base leading-relaxed text-ink md:text-lg">{s.intro}</p>
              </div>
            )}
            <div>
              <SectionHead eyebrow="What This Service Covers" title="Scope of service" />
              <ListBlock items={s.sub_services} testId="service-covers-list" />
            </div>
            {s.who_needs?.length > 0 && (
              <div>
                <SectionHead eyebrow="Who May Need This" title="Who may need this service" />
                <ListBlock items={s.who_needs} testId="service-who-list" />
              </div>
            )}
            {s.documents?.length > 0 && (
              <div>
                <SectionHead eyebrow="Documents" title="Required documents" />
                <ListBlock items={s.documents} testId="service-documents-list" />
              </div>
            )}
            {s.process?.length > 0 && (
              <div>
                <SectionHead eyebrow="Process Overview" title="How we work" />
                <ol className="mt-8 space-y-0 border-l border-gold/50" data-testid="service-process-list">
                  {s.process.map((p, i) => (
                    <li key={p} className="relative pb-8 pl-10 last:pb-0">
                      <span className="absolute -left-4 top-0 flex h-8 w-8 items-center justify-center bg-navy font-mono text-xs text-gold">{i + 1}</span>
                      <p className="pt-1 text-ink">{p}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {s.faqs?.length > 0 && (
              <div>
                <SectionHead eyebrow="FAQs" title="Frequently asked questions" />
                <Accordion type="single" collapsible className="mt-8 border-t border-slate-200" data-testid="service-faqs">
                  {s.faqs.map((f, i) => (
                    <AccordionItem key={i} value={`f${i}`} className="border-slate-200">
                      <AccordionTrigger className="py-5 text-left font-sans text-base font-medium text-navy hover:no-underline" data-testid={`faq-trigger-${i}`}>{f.q}</AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-slatey">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
          <aside className="lg:col-span-4">
            <div className="sticky top-32 border border-slate-200 bg-mist p-6 md:p-8" data-testid="service-enquiry-panel">
              <p className="eyebrow">Enquire</p>
              <h2 className="mt-3 text-2xl font-semibold">Send an enquiry about {s.name}</h2>
              <div className="mt-6 [&_form]:grid-cols-1 [&_form>*]:sm:col-span-1">
                <EnquiryForm kind="service" defaultService={s.name} prefix="service-enquiry-form" key={s.slug} />
              </div>
            </div>
          </aside>
        </div>
      </section>
      <section className="border-t border-slate-200 bg-mist py-16">
        <div className="container-x">
          <p className="eyebrow">Other Services</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {services.filter((x) => x.slug !== s.slug).map((x) => (
              <Link key={x.slug} to={`/services/${x.slug}`} className="border border-slate-300 bg-white px-4 py-2 text-sm text-navy transition-colors hover:border-gold hover:text-gold-hover" data-testid={`other-service-${x.slug}`}>{x.name}</Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
