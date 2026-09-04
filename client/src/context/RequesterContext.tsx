import React, { createContext, useContext, useState, useEffect } from "react";
import { RequesterUser } from "../types.js";

interface RequesterContextType {
  currentRequester: RequesterUser | null;
  setRequester: (user: RequesterUser | null) => void;
  clearRequester: () => void;
  isLoading: boolean;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

const STORAGE_KEY = "toktickit_current_requester";

export const RequesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRequester, setCurrentRequesterState] = useState<RequesterUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCurrentRequesterState(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setRequester = (user: RequesterUser | null) => {
    setCurrentRequesterState(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearRequester = () => {
    setCurrentRequesterState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        setRequester,
        clearRequester,
        isLoading,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
};

export function useRequester(): RequesterContextType {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
