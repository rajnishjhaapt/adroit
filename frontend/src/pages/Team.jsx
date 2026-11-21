import { Link } from "react-router-dom";
import { ArrowRight, Quote } from "lucide-react";
import { useSite } from "@/lib/site";
import { initials } from "@/lib/api";
import { Seo } from "@/components/site/Seo";
import { PageHero, ConsultCta } from "@/components/site/Blocks";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const PartnerAvatar = ({ p, size = "h-28 w-28 text-4xl" }) => (
  p.photo_url
    ? <img src={p.photo_url} alt={p.name} className={`${size} shrink-0 rounded-full border-2 border-gold object-cover`} />
    : <span className={`${size} flex shrink-0 items-center justify-center rounded-full border-2 border-gold bg-navy font-serif font-semibold text-gold`}>{initials(p.name)}</span>
);

const PartnerCard = ({ p, i }) => (
  <Link to={`/team/${p.slug}`} className="card-lift group flex animate-fade-up flex-col border border-slate-200 bg-white p-8 md:p-10" style={{ animationDelay: `${i * 100}ms` }} data-testid={`partner-card-${p.slug}`}>
    <PartnerAvatar p={p} />
    <h3 className="mt-7 text-3xl font-semibold" data-testid={`partner-name-${p.slug}`}>{p.name}</h3>
    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-hover">{p.designation}</p>
    <div className="gold-rule mt-6" />
    <p className="mt-6 flex-1 font-serif text-lg italic leading-relaxed text-ink"><Quote className="mb-2 h-5 w-5 text-gold" />{p.quote}</p>
    <span className="btn-outline-navy mt-8 self-start group-hover:border-gold group-hover:text-gold-hover" data-testid={`partner-view-profile-${p.slug}`}>View Profile <ArrowRight className="h-4 w-4" /></span>
  </Link>
);

const Partners = ({ c }) => (
  <div data-testid="team-partners">
    <p className="eyebrow">Partners</p>
    <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">{c.company_name}</h2>
    <div className="gold-rule mt-6" />
    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {c.partners.map((p, i) => <PartnerCard key={p.slug} p={p} i={i} />)}
    </div>
  </div>
);

const Person = ({ name, label }) => (
  <div className="card-lift flex flex-col items-center border border-slate-200 bg-white px-6 py-10 text-center" data-testid={`team-member-${slug(name)}`}>
    <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold bg-navy font-serif text-3xl font-semibold text-gold">{initials(name)}</span>
    <h3 className="mt-6 text-2xl font-semibold">{name}</h3>
    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slatey">{label}</p>
  </div>
);

const Group = ({ eyebrow, title, people, label, testId }) => (
  <div data-testid={testId}>
    <p className="eyebrow">{eyebrow}</p>
    <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">{title}</h2>
    <div className="gold-rule mt-6" />
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((n) => <Person key={n} name={n} label={label} />)}
    </div>
  </div>
);

export default function Team() {
  const { content: c } = useSite();
  return (
    <>
      <Seo title="Our Team" description={`Partners of ${c.company_name} and associated CA firms.`} />
      <PageHero eyebrow="Our Team" title="The people behind our work" text={`Partners of ${c.company_name} and our associated Chartered Accountant firms.`} testId="team-hero" />
      <section className="bg-mist py-24 md:py-32">
        <div className="container-x space-y-24">
          <Partners c={c} />
          {c.firms.map((f) => (
            <Group key={f.name} eyebrow="Associated CA Firm" title={f.name} people={f.members} label={f.name} testId={`team-firm-${slug(f.name)}`} />
          ))}
        </div>
      </section>
      <ConsultCta />
    </>
  );
}
