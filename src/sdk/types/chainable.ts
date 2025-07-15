/**
 * Comprehensive Chainable Operations Type Definitions
 * Updated to match the desired API structure with unified operation patterns
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { LoomCalUser, OrgCustomer } from "./user";
import {
  LoomCalEvent,
  UpdateEventRequest,
  UniquenessCriteria,
  UniquenessField,
} from "./event";
import { PaginatedResponse } from "./common";

// ===== QUERY OPERATORS =====
export interface QueryOperators {
  $gt?: any;
  $gte?: any;
  $lt?: any;
  $lte?: any;
  $eq?: any;
  $ne?: any;
  $in?: any[];
  $nin?: any[];
  $exists?: boolean;
  $regex?: string;
  $or?: QueryCondition[];
  $and?: QueryCondition[];
  $not?: QueryCondition;
}

export interface QueryCondition {
  [key: string]: any | QueryOperators;
}

// ===== SORTING =====
export type SortOrder = "asc" | "desc";

// ===== COMMON OPERATION OPTIONS =====
export interface OperationOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

// ===== SAVING RULE =====

export interface SavingRule {
  timeBetweenDuplicates?: number; // -1 = infinite time (check uniqueness only), 0 = no checking (always allow), >0 = check time constraint first
  uniquenessFields?: string[] | UniquenessCriteria; // Fields to check for uniqueness (simple array or complex logical structure)
  onDuplicate?: "update" | "ignore" | "reject"; // Action on duplicate events
}

// Enhanced isSigned configuration
export interface SignedConfig {
  check: boolean; // Whether to check if user is linked to a LoomCal account
  createUser?: boolean; // For createEvents only: create user object if not signed (allows future linking)
  strict?: boolean; // For strict validation (requires email when checking)
}

// ===== DEFAULT OPTIONS =====
export interface CreateDefaultOptions {
  isSigned?: SignedConfig; // Only SignedConfig object for createEvents
  savingRule?: SavingRule; // Specific to createEvents
  // No limit, offset, sortBy, sortOrder for create operations
}

export interface GetDefaultOptions extends OperationOptions {
  isSigned?: boolean; // Simple boolean check for getEvents
  // No savingRule for get operations
}

export interface UpdateDefaultOptions extends OperationOptions {
  isSigned?: boolean; // Simple boolean check for updateEvents
}

export interface DeleteDefaultOptions extends OperationOptions {
  isSigned?: boolean; // Simple boolean check for deleteEvents
}

export interface ChainableOptions {
  defaultOptions?:
    | CreateDefaultOptions
    | GetDefaultOptions
    | UpdateDefaultOptions
    | DeleteDefaultOptions;
  stopOnError?: boolean;
}

// ===== EVENT OPERATIONS =====

// Create Events Data Structure
export interface CreateEventData {
  title: string;
  description?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  repeat?: string;
  type?: string;
  color?: string;
  resource?: string;
  customData?: Record<string, unknown>;
  user: {
    identifier: string;
    email?: string;
    name?: string;
    customData?: Record<string, unknown>;
    linkedUserId?: string;
  };
}

export interface CreateEventItem {
  event: CreateEventData;
  options?: {
    isSigned?: SignedConfig; // Only SignedConfig object allowed for create
    savingRule?: SavingRule;
    // No limit, offset, sortBy, sortOrder for create operations
  };
}

// Base event target fields with comprehensive field support
interface BaseEventTarget {
  identifier?: string | QueryOperators;
  title?: string | QueryOperators;
  description?: string | QueryOperators;
  type?: string | QueryOperators;
  startTime?: string | Date | QueryOperators;
  endTime?: string | Date | QueryOperators;
  repeat?: string | QueryOperators;
  color?: string | QueryOperators;
  resource?: string | QueryOperators;
  customData?: Record<string, unknown> | QueryOperators;

  // User field targeting
  userEmail?: string | QueryOperators;
  userIdentifier?: string | QueryOperators;
  "user.email"?: string | QueryOperators;
  "user.identifier"?: string | QueryOperators;
  "user.name"?: string | QueryOperators;
  "user.linkedUserId"?: string | QueryOperators;
  linkedUserId?: string | QueryOperators; // Direct linkedUserId access
  createdAt?: string | Date | QueryOperators;
  updatedAt?: string | Date | QueryOperators;

  // Logical operators
  $or?: QueryCondition[];
  $and?: QueryCondition[];
  $not?: QueryCondition;
}

// Get Events Data Structure - allows comprehensive field targeting including nested fields
export type GetEventTarget = BaseEventTarget & {
  // Dynamic customData field targeting
  [K in `customData.${string}`]?: any;
} & {
  // Dynamic user.customData field targeting
  [K in `user.customData.${string}`]?: any;
};

export interface GetEventItem {
  target: GetEventTarget;
  options?: OperationOptions & {
    isSigned?: boolean;
    // No savingRule for get operations
  };
}

// Update Events Data Structure - allows comprehensive field targeting including nested fields
export type UpdateEventTarget = BaseEventTarget & {
  // Dynamic customData field targeting
  [K in `customData.${string}`]?: any;
} & {
  // Dynamic user.customData field targeting
  [K in `user.customData.${string}`]?: any;
};

export interface UpdateEventData {
  title?: string;
  description?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  repeat?: string;
  type?: string;
  color?: string;
  resource?: string;
  customData?: Record<string, unknown>;
}

export interface UpdateEventItem {
  target: UpdateEventTarget;
  updates: UpdateEventData;
  options?: OperationOptions & {
    isSigned?: boolean;
  };
}

// Delete Events Data Structure - allows comprehensive field targeting including nested fields
export type DeleteEventTarget = BaseEventTarget & {
  // Dynamic customData field targeting
  [K in `customData.${string}`]?: any;
} & {
  // Dynamic user.customData field targeting
  [K in `user.customData.${string}`]?: any;
};

export interface DeleteEventItem {
  target: DeleteEventTarget;
  options?: OperationOptions & {
    isSigned?: boolean;
  };
}

// ===== USER OPERATIONS =====

// Create Users Data Structure - Enhanced with linkedUserId support
export interface CreateUserData {
  identifier: string;
  email?: string;
  name?: string;
  customData?: Record<string, unknown>;
  linkedUserId?: string; // Maps to linked_user_id in database
}

export interface CreateUserItem {
  user: CreateUserData;
  options?: {
    isSigned?: boolean | SignedConfig;
    // No limit, offset, sortBy, sortOrder for create operations
  };
}

// Get Users Data Structure - comprehensive field support with all queryable fields
export interface GetUserTarget {
  id?: string | QueryOperators; // Primary key ID
  identifier?: string | QueryOperators;
  email?: string | QueryOperators;
  name?: string | QueryOperators;
  customData?: Record<string, unknown> | QueryOperators;
  linkedUserId?: string | QueryOperators; // Maps to linked_user_id in database
  createdAt?: string | Date | QueryOperators; // Maps to created_at in database
  updatedAt?: string | Date | QueryOperators; // Maps to updated_at in database

  // Logical operators
  $or?: QueryCondition[];
  $and?: QueryCondition[];
  $not?: QueryCondition;
}

// Enhanced GetUserTarget with dynamic customData field support
export type EnhancedGetUserTarget = GetUserTarget & {
  [K in `customData.${string}`]?: any;
};

export interface GetUserItem {
  target: EnhancedGetUserTarget;
  options?: OperationOptions & {
    isSigned?: boolean;
    // No savingRule for get operations
  };
}

// Update Users Data Structure - comprehensive field support with all updatable fields
export interface UpdateUserTarget {
  id?: string | QueryOperators; // Primary key ID for targeting
  identifier?: string | QueryOperators;
  email?: string | QueryOperators;
  name?: string | QueryOperators;
  customData?: Record<string, unknown> | QueryOperators;
  linkedUserId?: string | QueryOperators; // Maps to linked_user_id in database
  createdAt?: string | Date | QueryOperators; // Maps to created_at in database
  updatedAt?: string | Date | QueryOperators; // Maps to updated_at in database

  // Logical operators
  $or?: QueryCondition[];
  $and?: QueryCondition[];
  $not?: QueryCondition;
}

// Enhanced UpdateUserTarget with dynamic customData field support
export type EnhancedUpdateUserTarget = UpdateUserTarget & {
  [K in `customData.${string}`]?: any;
};

export interface UpdateUserData {
  identifier?: string;
  email?: string;
  name?: string;
  customData?: Record<string, unknown>;
  linkedUserId?: string; // Maps to linked_user_id in database
}

export interface UpdateUserItem {
  target: EnhancedUpdateUserTarget | EnhancedUpdateUserTarget[];
  updates: UpdateUserData;
  options?: OperationOptions & {
    isSigned?: boolean;
    limit?: number; // -1 means no limit
  };
}

// Delete Users Data Structure - comprehensive field support with all deletable fields
export interface DeleteUserTarget {
  id?: string | QueryOperators; // Primary key ID for targeting
  identifier?: string | QueryOperators;
  email?: string | QueryOperators;
  name?: string | QueryOperators;
  customData?: Record<string, unknown> | QueryOperators;
  linkedUserId?: string | QueryOperators; // Maps to linked_user_id in database
  createdAt?: string | Date | QueryOperators; // Maps to created_at in database
  updatedAt?: string | Date | QueryOperators; // Maps to updated_at in database

  // Logical operators
  $or?: QueryCondition[];
  $and?: QueryCondition[];
  $not?: QueryCondition;
}

// Enhanced DeleteUserTarget with dynamic customData field support
export type EnhancedDeleteUserTarget = DeleteUserTarget & {
  [K in `customData.${string}`]?: any;
};

export interface DeleteUserItem {
  target: EnhancedDeleteUserTarget | EnhancedDeleteUserTarget[];
  options?: OperationOptions & {
    isSigned?: boolean;
    limit?: number; // -1 means no limit
  };
}

// ===== CHAIN EXECUTION =====

export interface ChainOperation {
  type:
    | "createEvents"
    | "getEvents"
    | "updateEvents"
    | "deleteEvents"
    | "createUsers"
    | "getUsers"
    | "updateUsers"
    | "deleteUsers";
  data: any;
  options?: ChainableOptions;
}

export interface ChainExecutionResult {
  operations: ChainOperationResult[];
  success: boolean;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
}

export interface ChainOperationResult {
  operation: ChainOperation;
  success: boolean;
  result?: any;
  error?: {
    message: string;
    code?: string;
    status?: number;
  };
}

// ===== BULK API REQUEST/RESPONSE =====

export interface BulkOperationRequest {
  operations: ChainOperation[];
  globalOptions?: {
    stopOnError?: boolean;
    transactional?: boolean;
  };
}

export interface BulkOperationResponse {
  success: boolean;
  results: ChainOperationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    executionTimeMs: number;
  };
}

// ===== HELPER FUNCTIONS =====

export function $gt(value: any): QueryOperators {
  return { $gt: value };
}

export function $gte(value: any): QueryOperators {
  return { $gte: value };
}

export function $lt(value: any): QueryOperators {
  return { $lt: value };
}

export function $lte(value: any): QueryOperators {
  return { $lte: value };
}

export function $eq(value: any): QueryOperators {
  return { $eq: value };
}

export function $ne(value: any): QueryOperators {
  return { $ne: value };
}

export function $in(values: any[]): QueryOperators {
  return { $in: values };
}

export function $nin(values: any[]): QueryOperators {
  return { $nin: values };
}

export function $exists(exists: boolean): QueryOperators {
  return { $exists: exists };
}

export function $regex(pattern: string): QueryOperators {
  return { $regex: pattern };
}

export function $or(conditions: QueryCondition[]): QueryOperators {
  return { $or: conditions };
}

export function $and(conditions: QueryCondition[]): QueryOperators {
  return { $and: conditions };
}

export function $not(condition: QueryCondition): QueryOperators {
  return { $not: condition };
}

// ===== DEFAULT VALUES =====
export const DEFAULT_SAVING_RULE: Required<SavingRule> = {
  timeBetweenDuplicates: 0, // No checking by default
  uniquenessFields: [], // Check all fields by default (empty array means all)
  onDuplicate: "ignore", // Ignore duplicates by default
};

export const DEFAULT_SIGNED_CONFIG: Required<SignedConfig> = {
  check: false, // Don't check signed status by default
  createUser: false, // Don't create user by default
  strict: false, // Don't enforce strict validation by default
};

export const DEFAULT_OPERATION_OPTIONS: Required<OperationOptions> = {
  limit: -1, // No limit by default
  offset: 0, // Start from beginning
  sortBy: "createdAt", // Sort by creation time
  sortOrder: "asc", // Ascending order
};

// ===== ENHANCED OPTIONS WITH MERGING =====
export interface MergedCreateOptions {
  isSigned: Required<SignedConfig>;
  savingRule: Required<SavingRule>;
}

export interface MergedGetOptions extends Required<OperationOptions> {
  isSigned: boolean;
}

export interface MergedUpdateOptions extends Required<OperationOptions> {
  isSigned: boolean;
}

export interface MergedDeleteOptions extends Required<OperationOptions> {
  isSigned: boolean;
}
