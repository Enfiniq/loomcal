/**
 * Core SDK type definitions
 */
export interface LoomCalConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
    debug?: boolean;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        has_more: boolean;
    };
}
export interface GetEventsQuery {
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}
export interface GetUsersQuery {
    email?: string;
    limit?: number;
    offset?: number;
}
export interface DuplicationCheckResult {
    isDuplicate: boolean;
    existingEventId?: string;
    timeSinceLastEvent?: number;
    conflictingFields?: string[];
}
//# sourceMappingURL=common.d.ts.map