import React, { createContext, useContext, type ReactNode } from "react";

export type ApiClient = (endpoint: string, options?: RequestInit) => Promise<Response>;

interface ApiContextType {
  api: ApiClient;
}

const ApiContext = createContext<ApiContextType | null>(null);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context.api;
};

export const ApiProvider = ({ api, children }: { api: ApiClient; children: ReactNode }) => {
  return <ApiContext.Provider value={{ api }}>{children}</ApiContext.Provider>;
};
