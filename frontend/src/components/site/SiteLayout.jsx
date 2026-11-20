import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Phone, MessageCircle, Loader2 } from "lucide-react";
import { useSite } from "@/lib/site";
import { waLink } from "@/lib/api";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

const FloatingContact = ({ c }) => (
  <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3" data-testid="floating-contact">
    <a href={`tel:${c.phone_link}`} aria-label="Call now" data-testid="floating-call-btn"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-gold shadow-lg ring-1 ring-gold/40 transition-transform hover:scale-105">
      <Phone className="h-5 w-5" />
    </a>
    <a href={waLink(c.whatsapp_number, `Hello ${c.company_name}, I would like to discuss my requirement.`)} target="_blank" rel="noopener noreferrer"
      aria-label="Chat on WhatsApp" data-testid="floating-whatsapp-btn"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105">
      <MessageCircle className="h-5 w-5" />
    </a>
  </div>
);

export default function SiteLayout() {
  const { content, error, reload } = useSite();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!content) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy text-white" data-testid="site-loading">
        {error ? (
          <>
            <p>We could not load the website right now.</p>
            <button className="btn-gold" onClick={reload} data-testid="site-retry-btn">Try again</button>
          </>
        ) : <Loader2 className="h-8 w-8 animate-spin text-gold" />}
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      {pathname !== "/services" && <FloatingContact c={content} />}
    </div>
  );
}
