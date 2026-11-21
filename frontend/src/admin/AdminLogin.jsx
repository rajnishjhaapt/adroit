import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { Logo } from "@/components/site/Logo";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [f, setF] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(state?.expired ? "Your session has expired. Please sign in again." : "");

  useEffect(() => {
    document.title = "Admin Login | Adroit Management and Tax Consultants";
    api.get("/auth/me").then(() => navigate("/admin", { replace: true })).catch(() => {});
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.email.trim() || !f.password) { setError("Please enter your email and password"); return; }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/login", f);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="lattice hidden flex-col justify-between bg-navy p-12 text-white lg:flex">
        <Logo />
        <div>
          <p className="eyebrow">Staff Area</p>
          <h1 className="mt-4 text-5xl font-semibold text-white">Enquiry & content dashboard</h1>
          <p className="mt-4 max-w-md text-white/70">Authorised team members only.</p>
        </div>
        <p className="text-xs text-white/40">Adroit Management and Tax Consultants</p>
      </div>
      <div className="flex items-center justify-center bg-mist p-6">
        <form onSubmit={submit} noValidate className="w-full max-w-md border border-slate-200 bg-white p-8 md:p-10" data-testid="admin-login-form">
          <span className="flex h-12 w-12 items-center justify-center bg-navy text-gold"><Lock className="h-5 w-5" /></span>
          <h2 className="mt-6 text-3xl font-semibold">Admin Login</h2>
          <p className="mt-2 text-sm text-slatey">Sign in with your email ID and password.</p>
          {error && <p className="mt-6 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="admin-login-error">{error}</p>}
          <label className="mt-6 block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-navy">Email ID</span>
            <input className="field" type="email" autoComplete="username" value={f.email} onChange={set("email")} data-testid="admin-login-email" />
          </label>
          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-navy">Password</span>
            <input className="field" type="password" autoComplete="current-password" value={f.password} onChange={set("password")} data-testid="admin-login-password" />
          </label>
          <button type="submit" className="btn-gold mt-8 w-full" disabled={busy} data-testid="admin-login-submit">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Sign In
          </button>
          <a href="/" className="mt-6 block text-center text-sm text-slatey hover:text-gold-hover" data-testid="admin-login-back">Back to website</a>
        </form>
      </div>
    </div>
  );
}
