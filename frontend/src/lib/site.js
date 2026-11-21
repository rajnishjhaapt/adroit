import { createContext, createElement, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const SiteCtx = createContext(null);

export function SiteProvider({ children }) {
  const [state, setState] = useState({ content: null, services: [], error: false });

  const reload = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([api.get("/content"), api.get("/services")]);
      setState({ content: c.data, services: s.data, error: false });
    } catch {
      setState((p) => ({ ...p, error: true }));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return createElement(SiteCtx.Provider, { value: { ...state, reload } }, children);
}

export const useSite = () => useContext(SiteCtx);

export const addresses = (content) => [content.address, content.address_2].filter(Boolean);

export const experienceLabel = (content) => `${content.experience} Years of Experience`;
