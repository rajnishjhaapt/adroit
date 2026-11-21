import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export const STATUS = { new: "New", in_progress: "In Progress", completed: "Completed" };
export const KIND = { contact: "Contact", booking: "Booking", service: "Service Enquiry" };
export const STATUS_CLS = {
  new: "bg-gold-subtle text-gold-hover border-gold/40",
  in_progress: "bg-blue-50 text-blue-800 border-blue-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-");

export function useAdminApi() {
  const navigate = useNavigate();
  return useCallback(async (method, url, data, opts = {}) => {
    try {
      const res = await api.request({ method, url, data, ...opts });
      return res.data;
    } catch (e) {
      if (e?.response?.status === 401) navigate("/admin/login", { replace: true, state: { expired: true } });
      throw e;
    }
  }, [navigate]);
}

export const StatusBadge = ({ status }) => (
  <span className={`inline-block border px-2 py-0.5 text-xs font-medium ${STATUS_CLS[status] || ""}`}>{STATUS[status] || status}</span>
);
