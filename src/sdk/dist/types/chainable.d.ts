/**
 * Comprehensive Chainable Operations Type Definitions
 * Updated to match the desired API structure with unified operation patterns
 */
import { UniquenessCriteria } from "./event";
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
export type SortOrder = "asc" | "desc";
export interface OperationOptions {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: SortOrder;
}
export interface SavingRule {
    timeBetweenDuplicates?: number;
    uniquenessFields?: string[] | UniquenessCriteria;
    onDuplicate?: "update" | "ignore" | "reject";
}
export interface SignedConfig {
    check: boolean;
    createUser?: boolean;
    strict?: boolean;
}
export interface CreateDefaultOptions {
    isSigned?: SignedConfig;
    savingRule?: SavingRule;
}
export interface GetDefaultOptions extends OperationOptions {
    isSigned?: boolean;
}
export interface UpdateDefaultOptions extends OperationOptions {
    isSigned?: boolean;
}
export interface DeleteDefaultOptions extends OperationOptions {
    isSigned?: boolean;
}
export interface ChainableOptions {
    defaultOptions?: CreateDefaultOptions | GetDefaultOptions | UpdateDefaultOptions | DeleteDefaultOptions;
    stopOnError?: boolean;
}
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
        isSigned?: SignedConfig;
        savingRule?: SavingRule;
    };
}
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
    userEmail?: string | QueryOperators;
    userIdentifier?: string | QueryOperators;
    "user.email"?: string | QueryOperators;
    "user.identifier"?: string | QueryOperators;
    "user.name"?: string | QueryOperators;
    "user.linkedUserId"?: string | QueryOperators;
    linkedUserId?: string | QueryOperators;
    createdAt?: string | Date | QueryOperators;
    updatedAt?: string | Date | QueryOperators;
    $or?: QueryCondition[];
    $and?: QueryCondition[];
    $not?: QueryCondition;
}
export type GetEventTarget = BaseEventTarget & {
    [K in `customData.${string}`]?: any;
} & {
    [K in `user.customData.${string}`]?: any;
};
export interface GetEventItem {
    target: GetEventTarget;
    options?: OperationOptions & {
        isSigned?: boolean;
    };
}
export type UpdateEventTarget = BaseEventTarget & {
    [K in `customData.${string}`]?: any;
} & {
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
export type DeleteEventTarget = BaseEventTarget & {
    [K in `customData.${string}`]?: any;
} & {
    [K in `user.customData.${string}`]?: any;
};
export interface DeleteEventItem {
    target: DeleteEventTarget;
    options?: OperationOptions & {
        isSigned?: boolean;
    };
}
export interface CreateUserData {
    identifier: string;
    email?: string;
    name?: string;
    customData?: Record<string, unknown>;
    linkedUserId?: string;
}
export interface CreateUserItem {
    user: CreateUserData;
    options?: {
        isSigned?: boolean | SignedConfig;
    };
}
export interface GetUserTarget {
    id?: string | QueryOperators;
    identifier?: string | QueryOperators;
    email?: string | QueryOperators;
    name?: string | QueryOperators;
    customData?: Record<string, unknown> | QueryOperators;
    linkedUserId?: string | QueryOperators;
    createdAt?: string | Date | QueryOperators;
    updatedAt?: string | Date | QueryOperators;
    $or?: QueryCondition[];
    $and?: QueryCondition[];
    $not?: QueryCondition;
}
export type EnhancedGetUserTarget = GetUserTarget & {
    [K in `customData.${string}`]?: any;
};
export interface GetUserItem {
    target: EnhancedGetUserTarget;
    options?: OperationOptions & {
        isSigned?: boolean;
    };
}
export interface UpdateUserTarget {
    id?: string | QueryOperators;
    identifier?: string | QueryOperators;
    email?: string | QueryOperators;
    name?: string | QueryOperators;
    customData?: Record<string, unknown> | QueryOperators;
    linkedUserId?: string | QueryOperators;
    createdAt?: string | Date | QueryOperators;
    updatedAt?: string | Date | QueryOperators;
    $or?: QueryCondition[];
    $and?: QueryCondition[];
    $not?: QueryCondition;
}
export type EnhancedUpdateUserTarget = UpdateUserTarget & {
    [K in `customData.${string}`]?: any;
};
export interface UpdateUserData {
    identifier?: string;
    email?: string;
    name?: string;
    customData?: Record<string, unknown>;
    linkedUserId?: string;
}
export interface UpdateUserItem {
    target: EnhancedUpdateUserTarget | EnhancedUpdateUserTarget[];
    updates: UpdateUserData;
    options?: OperationOptions & {
        isSigned?: boolean;
        limit?: number;
    };
}
export interface DeleteUserTarget {
    id?: string | QueryOperators;
    identifier?: string | QueryOperators;
    email?: string | QueryOperators;
    name?: string | QueryOperators;
    customData?: Record<string, unknown> | QueryOperators;
    linkedUserId?: string | QueryOperators;
    createdAt?: string | Date | QueryOperators;
    updatedAt?: string | Date | QueryOperators;
    $or?: QueryCondition[];
    $and?: QueryCondition[];
    $not?: QueryCondition;
}
export type EnhancedDeleteUserTarget = DeleteUserTarget & {
    [K in `customData.${string}`]?: any;
};
export interface DeleteUserItem {
    target: EnhancedDeleteUserTarget | EnhancedDeleteUserTarget[];
    options?: OperationOptions & {
        isSigned?: boolean;
        limit?: number;
    };
}
export interface ChainOperation {
    type: "createEvents" | "getEvents" | "updateEvents" | "deleteEvents" | "createUsers" | "getUsers" | "updateUsers" | "deleteUsers";
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
export declare function $gt(value: any): QueryOperators;
export declare function $gte(value: any): QueryOperators;
export declare function $lt(value: any): QueryOperators;
export declare function $lte(value: any): QueryOperators;
export declare function $eq(value: any): QueryOperators;
export declare function $ne(value: any): QueryOperators;
export declare function $in(values: any[]): QueryOperators;
export declare function $nin(values: any[]): QueryOperators;
export declare function $exists(exists: boolean): QueryOperators;
export declare function $regex(pattern: string): QueryOperators;
export declare function $or(conditions: QueryCondition[]): QueryOperators;
export declare function $and(conditions: QueryCondition[]): QueryOperators;
export declare function $not(condition: QueryCondition): QueryOperators;
export declare const DEFAULT_SAVING_RULE: Required<SavingRule>;
export declare const DEFAULT_SIGNED_CONFIG: Required<SignedConfig>;
export declare const DEFAULT_OPERATION_OPTIONS: Required<OperationOptions>;
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
export {};
//# sourceMappingURL=chainable.d.ts.map