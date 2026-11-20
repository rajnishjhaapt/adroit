import { Outlet } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/react";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import { Logo } from "@/components/site/Logo";

export const ClerkLayout = () => (
  <ClerkAuthProvider>
    <Outlet />
  </ClerkAuthProvider>
);

const AuthShell = ({ children }) => (
  <div className="grid min-h-screen lg:grid-cols-2">
    <div className="lattice hidden flex-col justify-between bg-navy p-12 text-white lg:flex">
      <Logo />
      <div>
        <p className="eyebrow">Staff Area</p>
        <h1 className="mt-4 text-5xl font-semibold text-white">Enquiry & content dashboard</h1>
        <p className="mt-4 max-w-md text-white/70">Authorised team members only. New accounts need approval from an administrator.</p>
      </div>
      <p className="text-xs text-white/40">Adroit Management and Tax Consultants</p>
    </div>
    <div className="flex items-center justify-center bg-mist p-6" data-testid="auth-panel">{children}</div>
  </div>
);

export const SignInPage = () => (
  <AuthShell><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp fallbackRedirectUrl="/admin" /></AuthShell>
);

export const SignUpPage = () => (
  <AuthShell><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/admin" /></AuthShell>
);
