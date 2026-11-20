import { Link } from "react-router-dom";

export const Logo = ({ light = true, testId = "site-logo" }) => (
  <Link to="/" className="group flex items-center gap-3" data-testid={testId} aria-label="Adroit Management and Tax Consultants – Home">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-gold font-serif text-2xl font-semibold text-gold transition-colors group-hover:bg-gold group-hover:text-navy">
      A
    </span>
    <span className="leading-tight">
      <span className={`block font-serif text-xl font-semibold tracking-wide ${light ? "text-white" : "text-navy"}`}>Adroit</span>
      <span className={`block text-[10px] uppercase tracking-[0.18em] ${light ? "text-white/70" : "text-slatey"}`}>
        Management and Tax Consultants
      </span>
    </span>
  </Link>
);
