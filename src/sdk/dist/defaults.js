/**
 * Default configuration values for LoomCal operations
 * These values are used when no options are provided
 */
// Default values for all operations
export const DEFAULT_OPTIONS = {
    // Pagination defaults
    limit: -1, // No limit
    offset: 0,
    sortBy: "createdAt",
    sortOrder: "asc",
    // Signed user validation defaults
    isSigned: {
        check: false,
        createUser: false,
        strict: false,
    },
    // Saving rule defaults for create operations
    savingRule: {
        timeBetweenDuplicates: 0, // No checking (always allow)
        uniquenessFields: [], // Empty array when no checking
        onDuplicate: "ignore",
    },
};
/**
 * Merges options with priority: individual options > defaultOptions > DEFAULT_OPTIONS
 * @param individualOptions - Options specific to the operation
 * @param defaultOptions - Default options for the chain
 * @returns Merged options with proper priority
 */
export function mergeOptions(individualOptions, defaultOptions) {
    // Start with system defaults
    let merged = Object.assign({}, DEFAULT_OPTIONS);
    // Apply defaultOptions (lower priority) - deep merge for nested objects
    if (defaultOptions) {
        merged = Object.assign(Object.assign({}, merged), defaultOptions);
        // Handle nested objects - merge DEFAULT_OPTIONS + defaultOptions
        if (defaultOptions.savingRule) {
            merged.savingRule = Object.assign(Object.assign({}, DEFAULT_OPTIONS.savingRule), defaultOptions.savingRule);
        }
        if (defaultOptions.isSigned) {
            merged.isSigned = Object.assign(Object.assign({}, DEFAULT_OPTIONS.isSigned), defaultOptions.isSigned);
        }
    }
    // Apply individualOptions (HIGHEST priority) - should override everything
    if (individualOptions) {
        // Handle nested objects FIRST - before spreading individual options
        const tempMerged = Object.assign({}, merged);
        if (individualOptions.savingRule) {
            tempMerged.savingRule = Object.assign(Object.assign({}, merged.savingRule), individualOptions.savingRule);
        }
        if (individualOptions.isSigned) {
            tempMerged.isSigned = Object.assign(Object.assign({}, merged.isSigned), individualOptions.isSigned);
        }
        // Now spread individual options, but preserve our carefully merged nested objects
        merged = Object.assign(Object.assign(Object.assign(Object.assign({}, tempMerged), individualOptions), (tempMerged.savingRule && { savingRule: tempMerged.savingRule })), (tempMerged.isSigned && { isSigned: tempMerged.isSigned }));
    }
    return merged;
}
/**
 * Type-safe options merger for specific operation types
 */
export function mergeCreateOptions(individualOptions, defaultOptions) {
    const merged = mergeOptions(individualOptions, defaultOptions);
    // Validate and normalize specific fields
    if (merged.savingRule) {
        merged.savingRule = validateSavingRule(merged.savingRule);
    }
    if (merged.isSigned !== undefined) {
        merged.isSigned = validateSignedConfig(merged.isSigned);
    }
    return merged;
}
/**
 * Validates that when timeBetweenDuplicates is 0, no checking should be performed
 * @param savingRule - The saving rule to validate
 * @returns Validated saving rule
 */
export function validateSavingRule(savingRule) {
    // If timeBetweenDuplicates is 0, don't check anything
    if (savingRule.timeBetweenDuplicates === 0) {
        return Object.assign(Object.assign({}, savingRule), { timeBetweenDuplicates: 0, 
            // When no checking, these fields are irrelevant
            uniquenessFields: [], onDuplicate: "ignore" });
    }
    return savingRule;
}
/**
 * Validates isSigned configuration for create operations (SignedConfig only)
 * @param isSigned - The isSigned configuration
 * @returns Validated isSigned configuration
 */
export function validateSignedConfig(isSigned) {
    var _a, _b, _c;
    // Only handle SignedConfig objects for create operations
    return {
        check: (_a = isSigned.check) !== null && _a !== void 0 ? _a : false,
        createUser: (_b = isSigned.createUser) !== null && _b !== void 0 ? _b : false,
        strict: (_c = isSigned.strict) !== null && _c !== void 0 ? _c : false,
    };
}
