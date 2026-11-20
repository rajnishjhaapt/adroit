import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, MapPin, Phone, MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSite } from "@/lib/site";
import { waLink } from "@/lib/api";
import { Logo } from "@/components/site/Logo";

export const NAV = [
  ["/", "Home"], ["/about", "About Us"], ["/services", "Our Services"], ["/team", "Our Team"], ["/contact", "Contact Us"],
];

const linkCls = ({ isActive }) =>
  `relative py-2 text-sm tracking-wide transition-colors ${isActive ? "text-gold" : "text-white/85 hover:text-gold"}`;

const TopBar = ({ c }) => (
  <div className="hidden bg-navy-dark text-xs text-white/70 md:block">
    <div className="container-x flex items-center justify-between py-2">
      <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gold" />{c.address}</span>
      <div className="flex items-center gap-6">
        <a href={`tel:${c.phone_link}`} className="flex items-center gap-2 hover:text-gold" data-testid="topbar-call-link">
          <Phone className="h-3.5 w-3.5 text-gold" />{c.phone}
        </a>
        <a href={waLink(c.whatsapp_number)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gold" data-testid="topbar-whatsapp-link">
          <MessageCircle className="h-3.5 w-3.5 text-gold" />WhatsApp
        </a>
      </div>
    </div>
  </div>
);

export const Header = () => {
  const { content: c } = useSite();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50" data-testid="site-header">
      <TopBar c={c} />
      <div className="border-b border-gold/20 bg-navy/95 backdrop-blur-xl">
        <div className="container-x flex h-20 items-center justify-between gap-6">
          <Logo />
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === "/"} className={linkCls} data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/schedule-consultation" className="btn-gold hidden sm:inline-flex" data-testid="header-schedule-btn">
              Schedule a Consultation
            </Link>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button className="p-2 text-white lg:hidden" aria-label="Open menu" data-testid="mobile-menu-btn">
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm border-l border-gold/30 bg-navy text-white" data-testid="mobile-menu">
                <SheetTitle className="font-serif text-2xl text-white">Menu</SheetTitle>
                <nav className="mt-8 flex flex-col">
                  {NAV.map(([to, label]) => (
                    <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)}
                      className={({ isActive }) => `border-b border-white/10 py-4 text-lg ${isActive ? "text-gold" : "text-white"}`}
                      data-testid={`mobile-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                      {label}
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-8 flex flex-col gap-3">
                  <Link to="/schedule-consultation" onClick={() => setOpen(false)} className="btn-gold" data-testid="mobile-schedule-btn">Schedule a Consultation</Link>
                  <a href={`tel:${c.phone_link}`} className="btn-outline-light" data-testid="mobile-call-btn"><Phone className="h-4 w-4" />{c.phone}</a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
