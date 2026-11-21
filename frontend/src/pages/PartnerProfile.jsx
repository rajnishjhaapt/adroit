import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Quote } from "lucide-react";
import { useSite } from "@/lib/site";
import { Seo } from "@/components/site/Seo";
import { ConsultCta } from "@/components/site/Blocks";
import { PartnerAvatar } from "@/pages/Team";
import NotFound from "@/pages/NotFound";

export default function PartnerProfile() {
  const { slug } = useParams();
  const { content: c } = useSite();
  const p = c.partners.find((x) => x.slug === slug);
  if (!p) return <NotFound />;
  const others = c.partners.filter((x) => x.slug !== slug);
  return (
    <>
      <Seo title={`${p.name} – Partner`} description={`${p.name}, ${p.designation}. ${p.quote}`} />
      <section className="lattice bg-navy text-white" data-testid="partner-profile-hero">
        <div className="container-x py-16 md:py-24">
          <Link to="/team" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-gold" data-testid="back-to-team">
            <ArrowLeft className="h-4 w-4" />Back to Our Team
          </Link>
          <div className="mt-10 flex flex-col items-start gap-10 md:flex-row md:items-center">
            <div className="animate-fade-up"><PartnerAvatar p={p} size="h-40 w-40 text-6xl" /></div>
            <div className="animate-fade-up [animation-delay:120ms]">
              <p className="eyebrow">Partner Profile</p>
              <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl lg:text-6xl" data-testid="partner-profile-name">{p.name}</h1>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-gold" data-testid="partner-profile-designation">{p.designation}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-white py-20 md:py-28">
        <div className="container-x grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
          {p.portrait_url && (
            <figure className="relative animate-fade-up lg:col-span-5" data-testid="partner-profile-portrait">
              <div className="relative">
                <div className="absolute -left-3 -top-3 h-full w-full border border-gold/60" aria-hidden="true" />
                <img src={p.portrait_url} alt={`${p.name}, ${p.designation}`} loading="lazy" className="relative aspect-[4/5] w-full bg-mist object-cover object-top shadow-[0_30px_60px_-30px_rgba(16,36,58,0.5)]" />
              </div>
              <figcaption className="relative mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slatey">{p.name}</figcaption>
            </figure>
          )}
          <div className={`grid gap-12 ${p.portrait_url ? "lg:col-span-7" : "lg:col-span-12 lg:grid-cols-12 lg:gap-16"}`}>
          <blockquote className={`border-l-2 border-gold pl-8 ${p.portrait_url ? "" : "lg:col-span-5"}`} data-testid="partner-profile-quote">
            <Quote className="h-8 w-8 text-gold" />
            <p className="mt-6 font-serif text-2xl italic md:text-3xl leading-snug text-navy">“{p.quote.replace(/^[“"]|[”"]$/g, "")}”</p>
          </blockquote>
          <div className={`space-y-6 text-base leading-relaxed text-ink md:text-lg ${p.portrait_url ? "" : "lg:col-span-7"}`} data-testid="partner-profile-bio">
            {p.bio.map((para, i) => <p key={i}>{para}</p>)}
            <Link to="/team" className="btn-outline-navy mt-4" data-testid="back-to-team-bottom"><ArrowLeft className="h-4 w-4" />Back to Our Team</Link>
          </div>
          </div>
        </div>
      </section>
      {others.length > 0 && (
        <section className="border-t border-slate-200 bg-mist py-14">
          <div className="container-x flex flex-wrap items-center gap-4">
            <p className="eyebrow mr-4">Other Partners</p>
            {others.map((o) => (
              <Link key={o.slug} to={`/team/${o.slug}`} className="border border-slate-300 bg-white px-5 py-2 text-sm text-navy transition-colors hover:border-gold hover:text-gold-hover" data-testid={`other-partner-${o.slug}`}>{o.name}</Link>
            ))}
          </div>
        </section>
      )}
      <ConsultCta />
    </>
  );
}
