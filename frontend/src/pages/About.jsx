import { Link } from "react-router-dom";
import { ArrowUpRight, Eye, Target, ShieldCheck, Handshake, Award, HeartHandshake, Lightbulb, TrendingUp, Gem } from "lucide-react";
import { useSite, experienceLabel } from "@/lib/site";
import { Seo } from "@/components/site/Seo";
import { PageHero, SectionHead, ConsultCta } from "@/components/site/Blocks";
import { ServiceIcon } from "@/components/site/ServiceIcon";

const VALUE_ICONS = [ShieldCheck, Handshake, Award, HeartHandshake, Lightbulb, TrendingUp];

const Statement = ({ icon: Icon, eyebrow, text, testId, dark }) => (
  <div className={`relative p-10 md:p-14 ${dark ? "lattice bg-navy text-white" : "border border-gold/40 bg-white"}`} data-testid={testId}>
    <span className={`flex h-14 w-14 items-center justify-center border ${dark ? "border-gold text-gold" : "border-navy bg-navy text-gold"}`}><Icon className="h-6 w-6" strokeWidth={1.5} /></span>
    <h2 className={`mt-8 text-3xl font-semibold sm:text-4xl ${dark ? "text-white" : ""}`}>{eyebrow}</h2>
    <div className="gold-rule mt-6" />
    <p className={`mt-6 font-serif text-xl leading-relaxed md:text-2xl ${dark ? "text-white/85" : "text-ink"}`}>{text}</p>
  </div>
);

const VisionMission = ({ c }) => (c.vision || c.mission) ? (
  <section className="bg-mist py-24 md:py-32" data-testid="about-vision-mission">
    <div className="container-x grid gap-6 lg:grid-cols-2">
      {c.vision && <Statement icon={Eye} eyebrow="Our Vision" text={c.vision} testId="about-vision" dark />}
      {c.mission && <Statement icon={Target} eyebrow="Our Mission" text={c.mission} testId="about-mission" />}
    </div>
  </section>
) : null;

const CoreValues = ({ values }) => values?.length ? (
  <section className="bg-white py-24 md:py-32" data-testid="about-core-values">
    <div className="container-x">
      <SectionHead eyebrow="What Guides Us" title="Our Core Values" />
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {values.map((v, i) => {
          const Icon = VALUE_ICONS[i] || Gem;
          return (
            <div key={v.title} className="card-lift group relative border border-slate-200 bg-white p-8" data-testid={`core-value-${v.title.toLowerCase()}`}>
              <span className="absolute right-6 top-6 font-mono text-xs text-slatey">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex h-12 w-12 items-center justify-center bg-navy text-gold transition-colors group-hover:bg-gold group-hover:text-navy"><Icon className="h-6 w-6" strokeWidth={1.5} /></span>
              <h3 className="mt-6 text-2xl font-semibold">{v.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slatey">{v.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
) : null;

export default function About() {
  const { content: c, services } = useSite();
  return (
    <>
      <Seo title="About Us" description={`About ${c.company_name}: professional audit, taxation, accounting and business advisory consultancy in Noida with ${experienceLabel(c)}.`} />
      <PageHero eyebrow="About Us" title={c.company_name} text={c.tagline} testId="about-hero" />

      <section className="bg-white py-24 md:py-32" data-testid="about-intro-section">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionHead eyebrow="Who We Are" title="A professional consultancy for audit, taxation, accounting and advisory" />
            <div className="mt-8 space-y-5 text-base leading-relaxed text-ink md:text-lg">
              {c.about_intro.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
          <div className="lg:col-span-5">
            <img src="/images/desk.jpg" alt="Financial analysis on a desk" loading="lazy" className="aspect-[4/5] w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="lattice bg-navy py-20 text-white" data-testid="about-experience-band">
        <div className="container-x flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-14">
          <p className="font-serif text-8xl font-semibold leading-none text-gold">{c.experience}</p>
          <div>
            <p className="font-serif text-3xl text-white">{experienceLabel(c)}</p>
            <p className="mt-3 max-w-xl text-white/70">Supporting clients across audit, taxation, accounting and business advisory matters.</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 md:py-32">
        <div className="container-x grid gap-16 md:grid-cols-2">
          <div data-testid="about-approach">
            <SectionHead eyebrow="Our Approach" title="Structured, transparent and responsive" />
            <p className="mt-8 text-base leading-relaxed text-ink md:text-lg">{c.about_approach}</p>
          </div>
          <div data-testid="about-commitment">
            <SectionHead eyebrow="Our Commitment" title="Commitment to client service" />
            <p className="mt-8 text-base leading-relaxed text-ink md:text-lg">{c.about_commitment}</p>
          </div>
        </div>
      </section>

      <VisionMission c={c} />
      <CoreValues values={c.core_values} />

      <section className="bg-mist py-24 md:py-32" data-testid="about-expertise-section">
        <div className="container-x">
          <SectionHead eyebrow="Areas of Expertise" title="Where we can assist you" />
          <div className="mt-14 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link key={s.slug} to={`/services/${s.slug}`} className="group flex items-center gap-4 bg-white p-6 transition-colors hover:bg-gold-subtle" data-testid={`about-expertise-${s.slug}`}>
                <span className="text-gold"><ServiceIcon name={s.icon} className="h-5 w-5" /></span>
                <span className="flex-1 text-sm font-medium text-navy">{s.name}</span>
                <ArrowUpRight className="h-4 w-4 text-slatey group-hover:text-gold-hover" />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <ConsultCta />
    </>
  );
}
