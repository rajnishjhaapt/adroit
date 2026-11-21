import { useSearchParams } from "react-router-dom";
import { Phone, MessageCircle } from "lucide-react";
import { useSite, addresses } from "@/lib/site";
import { waLink } from "@/lib/api";
import { Seo } from "@/components/site/Seo";
import { PageHero } from "@/components/site/Blocks";
import { EnquiryForm } from "@/components/site/EnquiryForm";

export default function Schedule() {
  const { content: c, services } = useSite();
  const [params] = useSearchParams();
  const wanted = params.get("service") || "";
  const preset = services.some((s) => s.name === wanted) ? wanted : "";
  return (
    <>
      <Seo title="Schedule a Consultation" description={`Book a consultation with ${c.company_name} for GST, accounting, TDS, incorporation, notices, appeals and more.`} />
      <PageHero eyebrow="Schedule a Consultation" title="Book a time to discuss your requirement" text="Choose a service and your preferred date and time. Our team will contact you to confirm." testId="schedule-hero" />
      <section className="bg-mist py-20 md:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="border border-slate-200 bg-white p-6 md:p-10 lg:col-span-8" data-testid="booking-panel">
            <h2 className="text-3xl font-semibold">Consultation request</h2>
            <div className="gold-rule mb-10 mt-6" />
            <EnquiryForm kind="booking" defaultService={preset} prefix="booking-form" key={preset} />
          </div>
          <aside className="space-y-6 lg:col-span-4">
            <div className="lattice bg-navy p-8 text-white">
              <p className="eyebrow">Prefer to talk now?</p>
              <p className="mt-4 font-serif text-2xl">Call or WhatsApp us</p>
              <div className="mt-6 flex flex-col gap-3">
                <a href={`tel:${c.phone_link}`} className="btn-gold" data-testid="schedule-call-btn"><Phone className="h-4 w-4" />{c.phone}</a>
                <a href={waLink(c.whatsapp_number, `Hello ${c.company_name}, I would like to schedule a consultation.`)} target="_blank" rel="noopener noreferrer" className="btn-wa" data-testid="schedule-whatsapp-btn"><MessageCircle className="h-4 w-4" />WhatsApp</a>
              </div>
            </div>
            <div className="border border-slate-200 bg-white p-8 text-sm text-slatey">
              <p className="font-semibold text-navy">{c.address_2 ? "Offices" : "Office"}</p>
              {addresses(c).map((a, i) => <p key={i} className="mt-2">{a}</p>)}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
