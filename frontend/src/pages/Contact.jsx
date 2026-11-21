import { Link } from "react-router-dom";
import { MapPin, Phone, MessageCircle, CalendarCheck, Building } from "lucide-react";
import { useSite, addresses } from "@/lib/site";
import { waLink } from "@/lib/api";
import { Seo } from "@/components/site/Seo";
import { PageHero } from "@/components/site/Blocks";
import { EnquiryForm } from "@/components/site/EnquiryForm";

const Row = ({ icon: Icon, label, children, testId }) => (
  <div className="flex gap-5 border-b border-white/10 py-6" data-testid={testId}>
    <Icon className="mt-1 h-5 w-5 shrink-0 text-gold" strokeWidth={1.5} />
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{label}</p>
      <div className="mt-2 text-white">{children}</div>
    </div>
  </div>
);

export default function Contact() {
  const { content: c } = useSite();
  return (
    <>
      <Seo title="Contact Us" description={`Contact ${c.company_name} at ${c.address}. Call or WhatsApp ${c.phone}.`} />
      <PageHero eyebrow="Contact Us" title="Get in touch with our team" text="Call, WhatsApp or send us an enquiry. We will get back to you on the details you share." testId="contact-hero" />
      <section className="bg-white py-20 md:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lattice bg-navy p-8 md:p-10 lg:col-span-5" data-testid="contact-details">
            <h2 className="text-3xl font-semibold text-white">Contact details</h2>
            <div className="mt-6">
              <Row icon={Building} label="Company" testId="contact-company">{c.company_name}</Row>
              <Row icon={MapPin} label={c.address_2 ? "Office Addresses" : "Address"} testId="contact-address">
                {addresses(c).map((a, i) => <p key={i} className="[&+p]:mt-3" data-testid={`contact-address-${i}`}>{a}</p>)}
              </Row>
              <Row icon={Phone} label="Phone" testId="contact-phone"><a href={`tel:${c.phone_link}`} className="hover:text-gold">{c.phone}</a></Row>
              <Row icon={MessageCircle} label="WhatsApp" testId="contact-whatsapp">
                <a href={waLink(c.whatsapp_number)} target="_blank" rel="noopener noreferrer" className="break-all hover:text-gold">{waLink(c.whatsapp_number)}</a>
              </Row>
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <a href={`tel:${c.phone_link}`} className="btn-gold" data-testid="contact-call-now-btn"><Phone className="h-4 w-4" />Call Now</a>
              <a href={waLink(c.whatsapp_number, `Hello ${c.company_name}, I would like to discuss my requirement.`)} target="_blank" rel="noopener noreferrer" className="btn-wa" data-testid="contact-whatsapp-btn"><MessageCircle className="h-4 w-4" />WhatsApp Us</a>
              <Link to="/schedule-consultation" className="btn-outline-light" data-testid="contact-schedule-btn"><CalendarCheck className="h-4 w-4" />Schedule a Consultation</Link>
            </div>
          </div>
          <div className="lg:col-span-7">
            <p className="eyebrow">Send an Enquiry</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">How can we help?</h2>
            <div className="gold-rule mb-10 mt-6" />
            <EnquiryForm kind="contact" prefix="contact-form" />
          </div>
        </div>
      </section>
    </>
  );
}
