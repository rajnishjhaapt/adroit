import { Link } from "react-router-dom";
import { Seo } from "@/components/site/Seo";

export default function NotFound() {
  return (
    <section className="lattice flex min-h-[60vh] items-center bg-navy text-white" data-testid="not-found">
      <Seo title="Page Not Found" description="The page you are looking for could not be found." />
      <div className="container-x py-24">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">This page could not be found</h1>
        <Link to="/" className="btn-gold mt-10" data-testid="not-found-home-btn">Back to Home</Link>
      </div>
    </section>
  );
}
