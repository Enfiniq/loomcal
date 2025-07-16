/**
 * Default configuration values for LoomCal operations
 * These values are used when no options are provided
 */
import { SavingRule, SignedConfig } from "./types/chainable";
export declare const DEFAULT_OPTIONS: {
    limit: number;
    offset: number;
    sortBy: string;
    sortOrder: "asc";
    isSigned: SignedConfig;
    savingRule: SavingRule;
};
/**
 * Merges options with priority: individual options > defaultOptions > DEFAULT_OPTIONS
 * @param individualOptions - Options specific to the operation
 * @param defaultOptions - Default options for the chain
 * @returns Merged options with proper priority
 */
export declare function mergeOptions(individualOptions?: Record<string, unknown>, defaultOptions?: Record<string, unknown>): Record<string, unknown>;
/**
 * Type-safe options merger for specific operation types
 */
export declare function mergeCreateOptions(individualOptions?: {
    savingRule?: Partial<SavingRule>;
    isSigned?: Partial<SignedConfig>;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
}, defaultOptions?: {
    savingRule?: Partial<SavingRule>;
    isSigned?: Partial<SignedConfig>;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
}): Record<string, unknown>;
/**
 * Validates that when timeBetweenDuplicates is 0, no checking should be performed
 * @param savingRule - The saving rule to validate
 * @returns Validated saving rule
 */
export declare function validateSavingRule(savingRule: SavingRule): SavingRule;
/**
 * Validates isSigned configuration for create operations (SignedConfig only)
 * @param isSigned - The isSigned configuration
 * @returns Validated isSigned configuration
 */
export declare function validateSignedConfig(isSigned: SignedConfig): SignedConfig;
//# sourceMappingURL=defaults.d.ts.map