/**
 * loomcal - Modern Event Tracking SDK
 *
 * A comprehensive TypeScript SDK for LoomCal API with React components
 * LoomCal is a modern event tracking system where events can be any action,
 * commitment, or activity - from reading articles to completing challenges.
 *
 * @version 1.0.0
 * @author Enfiniq
 */
import { LoomCalConfig, CreateEventItem, GetEventItem, UpdateEventItem, DeleteEventItem, CreateUserItem, GetUserItem, UpdateUserItem, DeleteUserItem, ChainableOptions, ChainExecutionResult } from "./types";
export declare class LoomCal {
    private client;
    private config;
    private operationQueue;
    constructor(config: LoomCalConfig);
    private setupInterceptors;
    private shouldRetry;
    private delay;
    private request;
    /**
     * Create one or more events
     * Supports single event, multiple events, defaultOptions, and chaining
     */
    createEvents(data: CreateEventItem | CreateEventItem[], options?: ChainableOptions): LoomCal;
    /**
     * Process create event data to merge individual options with defaultOptions
     */
    private processCreateEventData;
    /**
     * Merge individual event options with default options
     */
    private mergeCreateEventOptions;
    /**
     * Get events with filtering and pagination
     * Supports single query, multiple queries, and chaining
     */
    getEvents(data: GetEventItem | GetEventItem[], options?: ChainableOptions): LoomCal;
    /**
     * Update events by query or ID
     * Supports single update, multiple updates, and chaining
     */
    updateEvents(data: UpdateEventItem | UpdateEventItem[], options?: ChainableOptions): LoomCal;
    /**
     * Delete events by query or ID
     * Supports single delete, multiple deletes, and chaining
     */
    deleteEvents(data: DeleteEventItem | DeleteEventItem[], options?: ChainableOptions): LoomCal;
    /**
     * Create one or more users
     * Supports single user, multiple users, and chaining
     */
    createUsers(data: CreateUserItem | CreateUserItem[], options?: ChainableOptions): LoomCal;
    /**
     * Get users with filtering and pagination
     * Supports single query, multiple queries, and chaining
     */
    getUsers(data: GetUserItem | GetUserItem[], options?: ChainableOptions): LoomCal;
    /**
     * Update users by query or ID
     * Supports single update, multiple updates, and chaining
     */
    updateUsers(data: UpdateUserItem | UpdateUserItem[], options?: ChainableOptions): LoomCal;
    /**
     * Delete users by query or ID
     * Supports single delete, multiple deletes, and chaining
     */
    deleteUsers(data: DeleteUserItem | DeleteUserItem[], options?: ChainableOptions): LoomCal;
    /**
     * Execute all queued operations as a single optimized bulk request
     */
    execute(): Promise<ChainExecutionResult>;
    /**
     * Check if a user exists by email or identifier
     */
    userExists(emailOrId: string): Promise<boolean>;
    /**
     * Get today's events
     */
    getTodaysEvents(): Promise<any[]>;
}
/**
 * Create a new LoomCal client instance
 */
export declare function createLoomCalClient(config: LoomCalConfig): LoomCal;
/**
 * Create a LoomCal client with debug enabled
 */
export declare function createDebugLoomCalClient(config: Omit<LoomCalConfig, "debug">): LoomCal;
export default LoomCal;
export { LoomCalError } from "./types";
export type { LoomCalConfig, PaginatedResponse, ApiResponse, CreateEventItem, GetEventItem, UpdateEventItem, DeleteEventItem, CreateUserItem, GetUserItem, UpdateUserItem, DeleteUserItem, ChainableOptions, ChainOperation, ChainExecutionResult, BulkOperationRequest, BulkOperationResponse, QueryOperators, QueryCondition, SavingRule, SignedConfig, CreateDefaultOptions, GetDefaultOptions, UpdateDefaultOptions, DeleteDefaultOptions, OperationOptions, } from "./types";
export { $gt, $gte, $lt, $lte, $eq, $ne, $in, $nin, $exists, $regex, $or, $and, $not, } from "./types";
export declare const VERSION = "1.0.0";
export declare const SDK_NAME = "loomcal";
//# sourceMappingURL=loomcal.d.ts.map