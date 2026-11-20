import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const api = axios.create({ baseURL: API });

export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return d.map((x) => String(x.msg).replace(/^Value error, /, "")).join(", ");
  return d || "Something went wrong. Please try again.";
};

export const waLink = (number, text) =>
  `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const serviceWaText = (company, serviceName) =>
  `Hello ${company},\n\nI would like to enquire about ${serviceName}.\n\nPlease contact me to discuss my requirement.\n\nThank you.`;

export const initials = (name) =>
  name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export const newKey = () =>
  (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
