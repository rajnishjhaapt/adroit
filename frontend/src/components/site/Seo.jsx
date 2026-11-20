import { useEffect } from "react";

const setMeta = (attr, key, value) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
};

export const Seo = ({ title, description }) => {
  useEffect(() => {
    const full = `${title} | Adroit Management and Tax Consultants`;
    document.title = full;
    setMeta("name", "description", description);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", window.location.href);
    setMeta("name", "twitter:title", full);
    setMeta("name", "twitter:description", description);
  }, [title, description]);
  return null;
};
