/**
 * Default configuration values for LoomCal operations
 * These values are used when no options are provided
 */

import { SavingRule, SignedConfig } from "./types/chainable";

// Default values for all operations
export const DEFAULT_OPTIONS = {
  // Pagination defaults
  limit: -1, // No limit
  offset: 0,
  sortBy: "createdAt",
  sortOrder: "asc" as const,

  // Signed user validation defaults
  isSigned: {
    check: false,
    createUser: false,
    strict: false,
  } as SignedConfig,

  // Saving rule defaults for create operations
  savingRule: {
    timeBetweenDuplicates: 0, // No checking (always allow)
    uniquenessFields: [], // Empty array when no checking
    onDuplicate: "ignore" as const,
  } as SavingRule,
};

/**
 * Merges options with priority: individual options > defaultOptions > DEFAULT_OPTIONS
 * @param individualOptions - Options specific to the operation
 * @param defaultOptions - Default options for the chain
 * @returns Merged options with proper priority
 */
export function mergeOptions(
  individualOptions?: Record<string, unknown>,
  defaultOptions?: Record<string, unknown>
): Record<string, unknown> {
  // Start with system defaults
  let merged = { ...DEFAULT_OPTIONS };

  // Apply defaultOptions (lower priority) - deep merge for nested objects
  if (defaultOptions) {
    merged = { ...merged, ...defaultOptions };

    // Handle nested objects - merge DEFAULT_OPTIONS + defaultOptions
    if (defaultOptions.savingRule) {
      merged.savingRule = {
        ...DEFAULT_OPTIONS.savingRule,
        ...defaultOptions.savingRule,
      };
    }
    if (defaultOptions.isSigned) {
      merged.isSigned = {
        ...DEFAULT_OPTIONS.isSigned,
        ...defaultOptions.isSigned,
      };
    }
  }

  // Apply individualOptions (HIGHEST priority) - should override everything
  if (individualOptions) {
    // Handle nested objects FIRST - before spreading individual options
    const tempMerged = { ...merged };

    if (individualOptions.savingRule) {
      tempMerged.savingRule = {
        ...merged.savingRule, // Use already-merged savingRule (DEFAULT + defaultOptions)
        ...individualOptions.savingRule, // Override with individual values
      };
    }
    if (individualOptions.isSigned) {
      tempMerged.isSigned = {
        ...merged.isSigned, // Use already-merged isSigned (DEFAULT + defaultOptions)
        ...individualOptions.isSigned, // Override with individual values
      };
    }

    // Now spread individual options, but preserve our carefully merged nested objects
    merged = {
      ...tempMerged,
      ...individualOptions,
      // Restore the properly merged nested objects (they shouldn't be overwritten)
      ...(tempMerged.savingRule && { savingRule: tempMerged.savingRule }),
      ...(tempMerged.isSigned && { isSigned: tempMerged.isSigned }),
    };
  }

  return merged;
}

/**
 * Type-safe options merger for specific operation types
 */
export function mergeCreateOptions(
  individualOptions?: {
    savingRule?: Partial<SavingRule>;
    isSigned?: Partial<SignedConfig>; // Only SignedConfig for create operations
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  },
  defaultOptions?: {
    savingRule?: Partial<SavingRule>;
    isSigned?: Partial<SignedConfig>; // Only SignedConfig for create operations
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  }
) {
  const merged = mergeOptions(individualOptions, defaultOptions);

  // Validate and normalize specific fields
  if (merged.savingRule) {
    merged.savingRule = validateSavingRule(merged.savingRule as SavingRule);
  }

  if (merged.isSigned !== undefined) {
    merged.isSigned = validateSignedConfig(merged.isSigned as SignedConfig);
  }

  return merged;
}

/**
 * Validates that when timeBetweenDuplicates is 0, no checking should be performed
 * @param savingRule - The saving rule to validate
 * @returns Validated saving rule
 */
export function validateSavingRule(savingRule: SavingRule): SavingRule {
  // If timeBetweenDuplicates is 0, don't check anything
  if (savingRule.timeBetweenDuplicates === 0) {
    return {
      ...savingRule,
      timeBetweenDuplicates: 0,
      // When no checking, these fields are irrelevant
      uniquenessFields: [],
      onDuplicate: "ignore",
    };
  }

  return savingRule;
}

/**
 * Validates isSigned configuration for create operations (SignedConfig only)
 * @param isSigned - The isSigned configuration
 * @returns Validated isSigned configuration
 */
export function validateSignedConfig(isSigned: SignedConfig): SignedConfig {
  // Only handle SignedConfig objects for create operations
  return {
    check: isSigned.check ?? false,
    createUser: isSigned.createUser ?? false,
    strict: isSigned.strict ?? false,
  };
}
