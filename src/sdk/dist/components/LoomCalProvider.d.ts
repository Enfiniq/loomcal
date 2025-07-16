/**
 * LoomCalProvider - Context provider for LoomCal SDK
 */
import React, { ReactNode } from "react";
import { LoomCal } from "../loomcal";
import { LoomCalConfig } from "../types";
interface LoomCalContextType {
    client: LoomCal;
    config: LoomCalConfig;
}
interface LoomCalProviderProps {
    children: ReactNode;
    config: LoomCalConfig;
}
export declare function LoomCalProvider({ children, config }: LoomCalProviderProps): React.JSX.Element;
export declare function useLoomCal(): LoomCalContextType;
export {};
//# sourceMappingURL=LoomCalProvider.d.ts.map