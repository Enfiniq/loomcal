/**
 * User-related type definitions
 */
export interface LoomCalUser {
    identifier: string;
    email?: string;
    name?: string;
    customData?: Record<string, unknown>;
    linkedUserId?: string;
}
export interface CreateUserRequest {
    identifier: string;
    email?: string;
    name?: string;
    customData?: Record<string, unknown>;
    linkedUserId?: string;
}
export interface OrgCustomer {
    identifier: string;
    organization_id: string;
    composite_id: string;
    name?: string;
    email?: string;
    customData?: Record<string, unknown>;
    linked_user_id?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateUserBatchRequest {
    users: Array<{
        identifier: string;
        email?: string;
        name?: string;
        customData?: Record<string, unknown>;
    }>;
    options?: CreateUserBatchOptions;
}
export interface CreateUserBatchOptions {
    /**
     * Whether to stop processing if one user creation fails
     * Default: false (continue processing other users)
     */
    stopOnError?: boolean;
    /**
     * Whether to process users in parallel or sequentially
     * Default: 'parallel'
     */
    processingMode?: "parallel" | "sequential";
    /**
     * Maximum number of users to process in parallel
     * Only used when processingMode is 'parallel'
     * Default: 10
     */
    maxConcurrency?: number;
}
export interface CreateUserBatchResponse {
    success: boolean;
    results: CreateUserBatchResult[];
    summary: {
        total: number;
        successful: number;
        failed: number;
        skipped: number;
    };
}
export interface CreateUserBatchResult {
    index: number;
    success: boolean;
    user?: OrgCustomer;
    error?: {
        message: string;
        code?: string;
        status?: number;
    };
}
export interface UpdateUserBatchRequest {
    updates: Array<{
        identifier: string;
        customData: {
            name?: string;
            email?: string;
            customData?: Record<string, unknown>;
        };
    }>;
    options?: UpdateUserBatchOptions;
}
export interface UpdateUserBatchOptions {
    stopOnError?: boolean;
    processingMode?: "parallel" | "sequential";
    maxConcurrency?: number;
}
export interface UpdateUserBatchResponse {
    success: boolean;
    results: UpdateUserBatchResult[];
    summary: {
        total: number;
        successful: number;
        failed: number;
    };
}
export interface UpdateUserBatchResult {
    index: number;
    identifier: string;
    success: boolean;
    user?: OrgCustomer;
    error?: {
        message: string;
        code?: string;
        status?: number;
    };
}
export interface DeleteUserBatchRequest {
    identifiers: string[];
    options?: DeleteUserBatchOptions;
}
export interface DeleteUserBatchOptions {
    stopOnError?: boolean;
    processingMode?: "parallel" | "sequential";
    maxConcurrency?: number;
}
export interface DeleteUserBatchResponse {
    success: boolean;
    results: DeleteUserBatchResult[];
    summary: {
        total: number;
        successful: number;
        failed: number;
    };
}
export interface DeleteUserBatchResult {
    index: number;
    identifier: string;
    success: boolean;
    error?: {
        message: string;
        code?: string;
        status?: number;
    };
}
//# sourceMappingURL=user.d.ts.map