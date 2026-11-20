import { useSite } from "@/lib/site";
import { Seo } from "@/components/site/Seo";
import { PageHero } from "@/components/site/Blocks";

const Section = ({ title, children }) => (
  <div className="border-b border-slate-200 py-8">
    <h2 className="text-2xl font-semibold">{title}</h2>
    <div className="mt-4 space-y-3 text-base leading-relaxed text-ink">{children}</div>
  </div>
);

const Wrap = ({ title, testId, children }) => (
  <>
    <PageHero eyebrow="Legal" title={title} testId={testId} />
    <section className="bg-white py-16 md:py-24"><div className="container-x max-w-4xl">{children}</div></section>
  </>
);

export function Privacy() {
  const { content: c } = useSite();
  return (
    <Wrap title="Privacy Policy" testId="privacy-hero">
      <Seo title="Privacy Policy" description={`Privacy Policy of ${c.company_name}.`} />
      <Section title="Information we collect">
        <p>When you submit a contact, enquiry or consultation form, we collect the details you provide: your name, mobile number, email address (if provided), the service you are interested in, your preferred date and time, and your message.</p>
      </Section>
      <Section title="How we use your information">
        <p>We use these details only to respond to your enquiry, schedule consultations and communicate with you about the services you requested. We do not sell your information.</p>
      </Section>
      <Section title="Consent">
        <p>We collect your information only after you give your consent on the form. You may ask us to stop contacting you at any time.</p>
      </Section>
      <Section title="Sensitive information">
        <p>Please do not share passwords, OTPs, bank credentials or other sensitive information through our website forms or WhatsApp.</p>
      </Section>
      <Section title="Storage and security">
        <p>Enquiries are stored in a secured database and can be accessed only by authorised members of our team through a protected login.</p>
      </Section>
      <Section title="WhatsApp and phone">
        <p>If you contact us through WhatsApp or by phone, your communication is also subject to the policies of the respective service provider.</p>
      </Section>
      <Section title="Contact">
        <p>For any privacy-related request, including access or deletion of your details, contact us at {c.phone} or visit us at {c.address}.</p>
      </Section>
    </Wrap>
  );
}

export function Terms() {
  const { content: c } = useSite();
  return (
    <Wrap title="Terms and Conditions" testId="terms-hero">
      <Seo title="Terms and Conditions" description={`Terms and Conditions for using the website of ${c.company_name}.`} />
      <Section title="Use of this website">
        <p>This website provides general information about the services of {c.company_name}. The content is for information only and does not constitute professional advice for any specific situation.</p>
      </Section>
      <Section title="No guarantee of outcomes">
        <p>We do not promise or guarantee tax savings, loan approvals, appeal outcomes, government approvals or specific timelines. Outcomes depend on the relevant authorities, institutions and the facts of each case.</p>
      </Section>
      <Section title="Enquiries and engagements">
        <p>Submitting an enquiry or consultation request does not create a professional engagement. Any engagement will be confirmed separately with agreed scope and terms.</p>
      </Section>
      <Section title="Accuracy of information">
        <p>You are responsible for the accuracy of the information you provide. Please do not share passwords, OTPs or bank credentials through this website.</p>
      </Section>
      <Section title="Third-party links">
        <p>Links to WhatsApp or other third-party services are provided for convenience. We are not responsible for the content or policies of those services.</p>
      </Section>
      <Section title="Contact">
        <p>For questions about these terms, contact us at {c.phone}.</p>
      </Section>
    </Wrap>
  );
}
