import { useSite } from "@/lib/site";
import { initials } from "@/lib/api";
import { Seo } from "@/components/site/Seo";
import { PageHero, ConsultCta } from "@/components/site/Blocks";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

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
          <Group eyebrow="Partners" title={c.company_name} people={c.partners} label="Partner" testId="team-partners" />
          {c.firms.map((f) => (
            <Group key={f.name} eyebrow="Associated CA Firm" title={f.name} people={f.members} label={f.name} testId={`team-firm-${slug(f.name)}`} />
          ))}
        </div>
      </section>
      <ConsultCta />
    </>
  );
}
