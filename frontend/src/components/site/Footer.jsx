import { Link } from "react-router-dom";
import { MapPin, Phone, MessageCircle } from "lucide-react";
import { useSite, experienceLabel, addresses } from "@/lib/site";
import { waLink } from "@/lib/api";
import { Logo } from "@/components/site/Logo";
import { NAV } from "@/components/site/Header";

const ColTitle = ({ children }) => <h3 className="mb-6 font-sans text-xs font-semibold uppercase tracking-[0.22em] text-gold">{children}</h3>;

export const Footer = () => {
  const { content: c, services } = useSite();
  return (
    <footer className="border-t-2 border-gold bg-navy-dark text-white" data-testid="site-footer">
      <div className="container-x grid gap-12 py-20 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo testId="footer-logo" />
          <p className="mt-6 font-serif text-xl text-white">{c.company_name}</p>
          <p className="mt-2 text-sm text-white/60">{c.tagline}</p>
          <p className="mt-4 text-sm text-gold" data-testid="footer-experience">{experienceLabel(c)}</p>
        </div>
        <div className="lg:col-span-2">
          <ColTitle>Quick Links</ColTitle>
          <ul className="space-y-3 text-sm text-white/70">
            {NAV.map(([to, label]) => <li key={to}><Link to={to} className="hover:text-gold">{label}</Link></li>)}
            <li><Link to="/schedule-consultation" className="hover:text-gold">Schedule a Consultation</Link></li>
          </ul>
        </div>
        <div className="lg:col-span-3">
          <ColTitle>Services</ColTitle>
          <ul className="space-y-3 text-sm text-white/70">
            {services.map((s) => <li key={s.slug}><Link to={`/services/${s.slug}`} className="hover:text-gold">{s.name}</Link></li>)}
          </ul>
        </div>
        <div className="lg:col-span-3">
          <ColTitle>Contact</ColTitle>
          <ul className="space-y-4 text-sm text-white/70">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>
                {addresses(c).map((a, i) => (
                  <span key={i} className="block" data-testid={`footer-address-${i}`}>
                    {i > 0 && <span className="my-1 block font-serif text-base text-gold" data-testid="footer-address-ampersand">&amp;</span>}{a}
                  </span>
                ))}
              </span>
            </li>
            <li><a href={`tel:${c.phone_link}`} className="flex gap-3 hover:text-gold" data-testid="footer-phone"><Phone className="h-4 w-4 text-gold" />{c.phone}</a></li>
            <li><a href={waLink(c.whatsapp_number)} target="_blank" rel="noopener noreferrer" className="flex gap-3 hover:text-gold" data-testid="footer-whatsapp"><MessageCircle className="h-4 w-4 text-gold" />WhatsApp: {c.phone}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-4 py-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p data-testid="footer-copyright">© {new Date().getFullYear()} {c.company_name}. All rights reserved.</p>
          <div className="flex flex-wrap gap-6">
            <Link to="/privacy-policy" className="hover:text-gold" data-testid="footer-privacy-link">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-gold" data-testid="footer-terms-link">Terms and Conditions</Link>
            <Link to="/admin" className="hover:text-gold" data-testid="footer-staff-login">Staff Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
