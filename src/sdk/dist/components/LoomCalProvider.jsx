/**
 * LoomCalProvider - Context provider for LoomCal SDK
 */
"use client";
import React, { createContext, useContext, useMemo } from "react";
import { LoomCal } from "../loomcal";
import { LoomCalError } from "../types";
const LoomCalContext = createContext(null);
export function LoomCalProvider({ children, config }) {
    const client = useMemo(() => new LoomCal(config), [config]);
    const value = useMemo(() => ({
        client,
        config,
    }), [client, config]);
    return (<LoomCalContext.Provider value={value}>{children}</LoomCalContext.Provider>);
}
export function useLoomCal() {
    const context = useContext(LoomCalContext);
    if (!context) {
        throw new LoomCalError("useLoomCal must be used within a LoomCalProvider", 400, undefined, "CONTEXT_ERROR");
    }
    return context;
}
