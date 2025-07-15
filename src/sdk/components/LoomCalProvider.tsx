/**
 * LoomCalProvider - Context provider for LoomCal SDK
 */

"use client";

import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { LoomCal } from "../loomcal";
import { LoomCalConfig, LoomCalError } from "../types";

interface LoomCalContextType {
  client: LoomCal;
  config: LoomCalConfig;
}

const LoomCalContext = createContext<LoomCalContextType | null>(null);

interface LoomCalProviderProps {
  children: ReactNode;
  config: LoomCalConfig;
}

export function LoomCalProvider({ children, config }: LoomCalProviderProps) {
  const client = useMemo(() => new LoomCal(config), [config]);

  const value = useMemo(
    () => ({
      client,
      config,
    }),
    [client, config]
  );

  return (
    <LoomCalContext.Provider value={value}>{children}</LoomCalContext.Provider>
  );
}

export function useLoomCal(): LoomCalContextType {
  const context = useContext(LoomCalContext);

  if (!context) {
    throw new LoomCalError(
      "useLoomCal must be used within a LoomCalProvider",
      400,
      undefined,
      "CONTEXT_ERROR"
    );
  }

  return context;
}
