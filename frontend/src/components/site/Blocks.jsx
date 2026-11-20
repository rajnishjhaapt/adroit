import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useSite } from "@/lib/site";

export const PageHero = ({ eyebrow, title, text, children, testId = "page-hero" }) => (
  <section className="lattice relative overflow-hidden bg-navy text-white" data-testid={testId}>
    <div className="container-x relative py-20 md:py-28">
      <p className="eyebrow animate-fade-up">{eyebrow}</p>
      <h1 className="mt-5 max-w-4xl animate-fade-up text-4xl font-semibold leading-[1.1] text-white sm:text-5xl lg:text-6xl [animation-delay:100ms]">{title}</h1>
      {text && <p className="mt-6 max-w-2xl animate-fade-up text-base text-white/75 md:text-lg [animation-delay:200ms]">{text}</p>}
      {children}
    </div>
  </section>
);

export const SectionHead = ({ eyebrow, title, text, light = false, className = "" }) => (
  <div className={`max-w-2xl ${className}`}>
    <p className="eyebrow">{eyebrow}</p>
    <h2 className={`mt-4 text-3xl font-semibold leading-tight sm:text-4xl ${light ? "text-white" : "text-navy"}`}>{title}</h2>
    <div className="gold-rule mt-6" />
    {text && <p className={`mt-6 text-base md:text-lg ${light ? "text-white/70" : "text-slatey"}`}>{text}</p>}
  </div>
);

export const ConsultCta = () => {
  const { content: c } = useSite();
  return (
    <section className="bg-white py-20 md:py-28" data-testid="consultation-cta-section">
      <div className="container-x">
        <div className="lattice relative flex flex-col items-start justify-between gap-10 border border-gold/40 bg-navy p-10 md:flex-row md:items-center md:p-16">
          <div className="max-w-2xl">
            <p className="eyebrow">Consultation</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl" data-testid="cta-headline">{c.cta_headline}</h2>
            <p className="mt-4 text-white/70">Share your requirement and our team will get in touch to understand how we can assist.</p>
          </div>
          <Link to="/schedule-consultation" className="btn-gold shrink-0" data-testid="cta-schedule-btn">
            Schedule a Consultation <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export const SensitiveNotice = () => (
  <p className="border-l-2 border-gold bg-gold-subtle px-4 py-3 text-xs text-ink" data-testid="sensitive-info-notice">
    Please do not submit passwords, OTPs, bank credentials or any other sensitive information through this form.
  </p>
);
