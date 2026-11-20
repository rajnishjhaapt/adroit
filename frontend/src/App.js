import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useOutletContext } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { SiteProvider, useSite } from "@/lib/site";
import SiteLayout from "@/components/site/SiteLayout";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Services from "@/pages/Services";
import ServiceDetail from "@/pages/ServiceDetail";
import Team from "@/pages/Team";
import Contact from "@/pages/Contact";
import Schedule from "@/pages/Schedule";
import { Privacy, Terms } from "@/pages/Legal";
import NotFound from "@/pages/NotFound";
import { ClerkLayout, SignInPage, SignUpPage } from "@/admin/AuthPages";
import AdminGate from "@/admin/AdminShell";
import Overview from "@/admin/Overview";
import Enquiries from "@/admin/Enquiries";
import ServicesAdmin from "@/admin/ServicesAdmin";
import ContentAdmin from "@/admin/ContentAdmin";
import UsersAdmin from "@/admin/UsersAdmin";

const AdminOnly = ({ children }) => {
  const { member } = useOutletContext();
  const { content } = useSite();
  if (member.role !== "admin") return <Navigate to="/admin" replace />;
  if (!content) return null;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <SiteProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/team" element={<Team />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/schedule-consultation" element={<Schedule />} />
            <Route path="/privacy-policy" element={<Privacy />} />
            <Route path="/terms-and-conditions" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route element={<ClerkLayout />}>
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route path="/admin" element={<AdminGate />}>
              <Route index element={<Overview />} />
              <Route path="enquiries" element={<Enquiries />} />
              <Route path="services" element={<AdminOnly><ServicesAdmin /></AdminOnly>} />
              <Route path="content" element={<AdminOnly><ContentAdmin /></AdminOnly>} />
              <Route path="users" element={<AdminOnly><UsersAdmin /></AdminOnly>} />
            </Route>
          </Route>
        </Routes>
        <Toaster position="top-center" richColors />
      </SiteProvider>
    </BrowserRouter>
  );
}

export default App;
