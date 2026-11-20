import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, MapPin, Phone, MessageCircle, CheckCircle2 } from "lucide-react";
import { useSite, experienceLabel } from "@/lib/site";
import { waLink } from "@/lib/api";
import { Seo } from "@/components/site/Seo";
import { ServiceIcon } from "@/components/site/ServiceIcon";
import { SectionHead, ConsultCta } from "@/components/site/Blocks";

const Hero = ({ c }) => (
  <section className="lattice relative overflow-hidden bg-navy text-white" data-testid="home-hero">
    <div className="container-x grid items-center gap-14 py-20 md:py-28 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <p className="eyebrow animate-fade-up">Audit · Taxation · Business Advisory</p>
        <h1 className="mt-6 animate-fade-up text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-6xl [animation-delay:100ms]" data-testid="hero-headline">
          {c.hero_headline}
        </h1>
        <p className="mt-7 max-w-xl animate-fade-up text-base text-white/75 md:text-lg [animation-delay:200ms]" data-testid="hero-text">{c.hero_text}</p>
        <div className="mt-10 flex animate-fade-up flex-col gap-4 sm:flex-row [animation-delay:300ms]">
          <Link to="/schedule-consultation" className="btn-gold" data-testid="hero-schedule-consultation-btn">Schedule a Consultation <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/services" className="btn-outline-light" data-testid="hero-explore-services-btn">Explore Our Services</Link>
        </div>
      </div>
      <div className="relative lg:col-span-5">
        <div className="relative border border-gold/40 p-3">
          <img src="/images/hero.jpg" alt="Business consultants in a professional meeting" className="aspect-[4/5] w-full object-cover" width="700" height="875" fetchpriority="high" />
        </div>
        <div className="absolute -bottom-8 -left-4 border border-gold/50 bg-white px-7 py-5 text-navy shadow-2xl sm:-left-10" data-testid="hero-experience-card">
          <p className="font-serif text-5xl font-semibold text-gold-hover">{c.experience}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em]">Years of Experience</p>
        </div>
      </div>
    </div>
  </section>
);

const Experience = ({ c }) => (
  <section className="bg-white py-24 md:py-32" data-testid="experience-section">
    <div className="container-x grid items-center gap-12 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <p className="font-serif text-[7rem] font-semibold leading-none text-navy sm:text-[9rem]">{c.experience}</p>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.25em] text-gold-hover" data-testid="experience-label">{experienceLabel(c)}</p>
      </div>
      <div className="lg:col-span-7">
        <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Professional consultancy built on experience and structured work</h2>
        <div className="gold-rule mt-6" />
        <p className="mt-6 text-base text-slatey md:text-lg">
          With {experienceLabel(c).toLowerCase()}, {c.company_name} supports businesses and individuals with audit, taxation, accounting and business advisory services, from routine compliance to specific matters such as notices, appeals and financial documentation.
        </p>
        <Link to="/about" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-gold-hover" data-testid="experience-about-link">
          More about us <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </section>
);

export const ServiceCard = ({ s, i }) => (
  <article className="card-lift group flex flex-col border border-slate-200 bg-white p-8" data-testid={`service-card-${s.slug}`}>
    <div className="flex items-start justify-between">
      <span className="flex h-12 w-12 items-center justify-center bg-navy text-gold"><ServiceIcon name={s.icon} /></span>
      <span className="font-mono text-xs text-slatey">{String(i + 1).padStart(2, "0")}</span>
    </div>
    <h3 className="mt-6 text-2xl font-semibold leading-snug">{s.name}</h3>
    <p className="mt-3 flex-1 text-sm leading-relaxed text-slatey">{s.description}</p>
    <Link to={`/services/${s.slug}`} className="mt-6 inline-flex items-center gap-2 border-t border-slate-200 pt-5 text-sm font-medium text-navy transition-colors group-hover:text-gold-hover" data-testid={`explore-service-${s.slug}`}>
      Explore Service <ArrowUpRight className="h-4 w-4" />
    </Link>
  </article>
);

const ServicesGrid = ({ c, services }) => (
  <section className="bg-mist py-24 md:py-32" data-testid="services-overview-section">
    <div className="container-x">
      <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <SectionHead eyebrow="Our Services" title="Comprehensive services for every stage of your business" text={c.services_intro} />
        <Link to="/services" className="btn-outline-navy shrink-0" data-testid="services-view-all-btn">View All Services</Link>
      </div>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {services.map((s, i) => <ServiceCard key={s.slug} s={s} i={i} />)}
      </div>
    </div>
  </section>
);

const WhyUs = ({ c }) => (
  <section className="bg-white py-24 md:py-32" data-testid="why-choose-us-section">
    <div className="container-x grid gap-16 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <SectionHead eyebrow="Why Choose Us" title="A dependable partner for your financial and compliance needs" />
        <img src="/images/calc.jpg" alt="Accountant reviewing financial documents" loading="lazy" className="mt-10 hidden aspect-[4/3] w-full object-cover lg:block" />
      </div>
      <div className="divide-y divide-slate-200 border-y border-slate-200 lg:col-span-7">
        {c.why_choose.map((w, i) => (
          <div key={w.title} className="flex gap-6 py-7" data-testid={`why-item-${i}`}>
            <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-gold" strokeWidth={1.5} />
            <div>
              <h3 className="font-sans text-lg font-semibold text-navy">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slatey">{w.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const ContactStrip = ({ c }) => (
  <section className="bg-mist py-20" data-testid="home-contact-section">
    <div className="container-x grid gap-6 md:grid-cols-3">
      <div className="border border-slate-200 bg-white p-8">
        <MapPin className="h-6 w-6 text-gold" strokeWidth={1.5} />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slatey">Office Address</p>
        <p className="mt-2 text-navy" data-testid="home-contact-address">{c.address}</p>
      </div>
      <a href={`tel:${c.phone_link}`} className="card-lift border border-slate-200 bg-white p-8" data-testid="home-contact-call">
        <Phone className="h-6 w-6 text-gold" strokeWidth={1.5} />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slatey">Call Us</p>
        <p className="mt-2 text-navy">{c.phone}</p>
      </a>
      <a href={waLink(c.whatsapp_number)} target="_blank" rel="noopener noreferrer" className="card-lift border border-slate-200 bg-white p-8" data-testid="home-contact-whatsapp">
        <MessageCircle className="h-6 w-6 text-gold" strokeWidth={1.5} />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slatey">WhatsApp</p>
        <p className="mt-2 text-navy">{c.phone}</p>
      </a>
    </div>
  </section>
);

export default function Home() {
  const { content: c, services } = useSite();
  return (
    <>
      <Seo title="Audit, Taxation & Business Advisory in Noida" description={`${c.company_name} – GST, accounting, company incorporation, TDS, PF & ESIC, tax notices, appeals and business loan documentation. ${experienceLabel(c)}.`} />
      <Hero c={c} />
      <Experience c={c} />
      <ServicesGrid c={c} services={services} />
      <WhyUs c={c} />
      <ConsultCta />
      <ContactStrip c={c} />
    </>
  );
}
