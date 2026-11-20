import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, newKey } from "@/lib/api";
import { useSite } from "@/lib/site";
import { SensitiveNotice } from "@/components/site/Blocks";

const TIMES = ["10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const Field = ({ label, required, error, children, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-navy">
      {label} {required ? <span className="text-gold-hover">*</span> : <span className="normal-case tracking-normal text-slatey">(optional)</span>}
    </span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-600" data-testid="field-error">{error}</span>}
  </label>
);

const empty = (service) => ({ full_name: "", mobile: "", email: "", service: service || "", preferred_date: "", preferred_time: "", message: "", consent: false, website: "" });

function validate(f, kind) {
  const e = {};
  if (f.full_name.trim().length < 2) e.full_name = "Please enter your full name";
  if (!/^(\+?91[\s-]?|0)?[6-9]\d{9}$/.test(f.mobile.replace(/[\s-]/g, ""))) e.mobile = "Please enter a valid 10-digit mobile number";
  if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) e.email = "Please enter a valid email address";
  if (kind === "booking") {
    if (!f.service) e.service = "Please select a service";
    if (!f.preferred_date) e.preferred_date = "Please select a preferred date";
    else if (f.preferred_date < today()) e.preferred_date = "Date cannot be in the past";
    if (!f.preferred_time) e.preferred_time = "Please select a preferred time";
  } else if (f.message.trim().length < 5) e.message = "Please enter your message";
  if (!f.consent) e.consent = "Please provide your consent to continue";
  return e;
}

const Success = ({ reference, onReset, prefix }) => (
  <div className="flex flex-col items-start gap-5 border border-gold/40 bg-gold-subtle p-8" data-testid={`${prefix}-success`}>
    <CheckCircle2 className="h-10 w-10 text-gold-hover" strokeWidth={1.5} />
    <h3 className="text-2xl font-semibold">Thank you. Your enquiry has been received.</h3>
    <p className="text-sm text-ink">Your reference ID is</p>
    <p className="font-mono text-2xl font-semibold tracking-wider text-navy" data-testid={`${prefix}-reference-id`}>{reference}</p>
    <p className="text-sm text-slatey">Please keep this reference for future communication. Our team will contact you on the mobile number provided.</p>
    <button type="button" className="btn-outline-navy" onClick={onReset} data-testid={`${prefix}-new-btn`}>Submit another enquiry</button>
  </div>
);

export const EnquiryForm = ({ kind = "contact", defaultService = "", prefix = "contact-form", submitLabel }) => {
  const { services } = useSite();
  const [f, setF] = useState(() => empty(defaultService));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [key, setKey] = useState(newKey);
  const isBooking = kind === "booking";
  const minDate = useMemo(today, []);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const v = validate(f, kind);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const { data } = await api.post("/enquiries", { ...f, kind, submission_key: key });
      setReference(data.reference);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setF(empty(defaultService)); setReference(""); setErrors({}); setKey(newKey()); };
  if (reference) return <Success reference={reference} onReset={reset} prefix={prefix} />;

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2" data-testid={prefix}>
      <Field label="Full Name" required error={errors.full_name}>
        <input className="field" value={f.full_name} onChange={set("full_name")} autoComplete="name" data-testid={`${prefix}-name`} />
      </Field>
      <Field label="Mobile Number" required error={errors.mobile}>
        <input className="field" type="tel" inputMode="tel" value={f.mobile} onChange={set("mobile")} autoComplete="tel" placeholder="10-digit mobile" data-testid={`${prefix}-mobile`} />
      </Field>
      <Field label="Email Address" error={errors.email}>
        <input className="field" type="email" value={f.email} onChange={set("email")} autoComplete="email" data-testid={`${prefix}-email`} />
      </Field>
      <Field label={isBooking ? "Select Service" : "Service Interested In"} required={isBooking} error={errors.service}>
        <select className="field" value={f.service} onChange={set("service")} data-testid={`${prefix}-service`}>
          <option value="">Select a service</option>
          {services.map((s) => <option key={s.slug} value={s.name}>{s.name}</option>)}
        </select>
      </Field>
      {isBooking && (
        <>
          <Field label="Preferred Date" required error={errors.preferred_date}>
            <input className="field" type="date" min={minDate} value={f.preferred_date} onChange={set("preferred_date")} data-testid="booking-date-picker" />
          </Field>
          <Field label="Preferred Time" required error={errors.preferred_time}>
            <select className="field" value={f.preferred_time} onChange={set("preferred_time")} data-testid="booking-time-select">
              <option value="">Select a time</option>
              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </>
      )}
      <Field label={isBooking ? "Additional Message" : "Message"} required={!isBooking} error={errors.message} className="sm:col-span-2">
        <textarea className="field min-h-[130px]" value={f.message} onChange={set("message")} maxLength={2000} data-testid={`${prefix}-message`} />
      </Field>
      <input type="text" name="website" value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="sm:col-span-2"><SensitiveNotice /></div>
      <div className="sm:col-span-2">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[#C6A15B]" checked={f.consent} onChange={set("consent")} data-testid={`${prefix}-consent`} />
          <span>I consent to Adroit Management and Tax Consultants contacting me about this enquiry and processing my details as described in the <Link to="/privacy-policy" className="text-gold-hover underline">Privacy Policy</Link>. <span className="text-gold-hover">*</span></span>
        </label>
        {errors.consent && <span className="mt-1 block text-xs text-red-600" data-testid="consent-error">{errors.consent}</span>}
      </div>
      {isBooking && <p className="text-xs text-slatey sm:col-span-2">Your preferred date and time are subject to confirmation by our team.</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-gold w-full sm:w-auto" disabled={busy} data-testid={`${prefix}-submit-btn`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel || (isBooking ? "Schedule a Consultation" : "Submit Enquiry")}
        </button>
      </div>
    </form>
  );
};
