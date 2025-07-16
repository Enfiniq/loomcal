/**
 * Comprehensive Chainable Operations Type Definitions
 * Updated to match the desired API structure with unified operation patterns
 */
// ===== HELPER FUNCTIONS =====
export function $gt(value) {
    return { $gt: value };
}
export function $gte(value) {
    return { $gte: value };
}
export function $lt(value) {
    return { $lt: value };
}
export function $lte(value) {
    return { $lte: value };
}
export function $eq(value) {
    return { $eq: value };
}
export function $ne(value) {
    return { $ne: value };
}
export function $in(values) {
    return { $in: values };
}
export function $nin(values) {
    return { $nin: values };
}
export function $exists(exists) {
    return { $exists: exists };
}
export function $regex(pattern) {
    return { $regex: pattern };
}
export function $or(conditions) {
    return { $or: conditions };
}
export function $and(conditions) {
    return { $and: conditions };
}
export function $not(condition) {
    return { $not: condition };
}
// ===== DEFAULT VALUES =====
export const DEFAULT_SAVING_RULE = {
    timeBetweenDuplicates: 0, // No checking by default
    uniquenessFields: [], // Check all fields by default (empty array means all)
    onDuplicate: "ignore", // Ignore duplicates by default
};
export const DEFAULT_SIGNED_CONFIG = {
    check: false, // Don't check signed status by default
    createUser: false, // Don't create user by default
    strict: false, // Don't enforce strict validation by default
};
export const DEFAULT_OPERATION_OPTIONS = {
    limit: -1, // No limit by default
    offset: 0, // Start from beginning
    sortBy: "createdAt", // Sort by creation time
    sortOrder: "asc", // Ascending order
};
