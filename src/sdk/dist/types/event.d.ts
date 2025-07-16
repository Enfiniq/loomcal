/**
 * Event-related type definitions
 */
import { LoomCalUser } from "./user";
export interface LoomCalEvent extends OrgEvent {
    org_customers?: {
        identifier: string;
        name?: string;
        email?: string;
        data?: Record<string, unknown>;
    };
}
export interface OrgEvent {
    id: string;
    organization_id: string;
    org_customer_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time?: string;
    repeat?: string;
    type?: string;
    color?: string;
    resource?: string;
    custom_data?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface OrgEventWithCustomer extends OrgEvent {
    org_customers: {
        identifier: string;
        name?: string;
        email?: string;
        data?: Record<string, unknown>;
    };
}
export interface CreateEventRequest {
    title: string;
    description?: string;
    startTime?: Date | string;
    endTime?: Date | string;
    repeat?: "daily" | "weekly" | "monthly" | "yearly" | string;
    type?: string;
    color?: string;
    resource?: string;
    customData?: Record<string, unknown>;
    user: LoomCalUser;
    options?: CreateEventOptions;
}
export interface CreateEventOptions {
    isSignedWithLoomCal?: boolean;
    savingRule?: EventSavingRule;
}
export interface EventSavingRule {
    /**
     * Time interval (in seconds) that must pass before the same event can be saved again
     * Special values:
     * - 0: No time-based deduplication (default) - every event gets its own row
     * - -1: Always check for duplicates (no time constraint) - check uniquenessFields regardless of time
     * - Any positive number: Minimum seconds between identical events
     */
    timeBetweenDuplicates?: number;
    /**
     * Fields to consider when determining if events are identical
     * Can be:
     * 1. Simple array of field names (backward compatibility)
     * 2. Complex logical structure with $and, $or, $not operators
     *
     * Examples:
     * - Simple: ["title", "startTime", "user", "user.email", "customData.priority"]
     * - Complex: { $and: [{ title: true }, { $or: [{ startTime: true }, { type: true }] }] }
     *
     * If not specified, all fields are considered
     */
    uniquenessFields?: Array<keyof Pick<CreateEventRequest, "title" | "description" | "startTime" | "endTime" | "type" | "repeat" | "color" | "resource" | "customData"> | "user" | "user.email" | "user.name" | "user.identifier" | `customData.${string}` | `user.customData.${string}`> | UniquenessCriteria;
    /**
     * Action to take when a duplicate is detected
     * - 'reject': Throw an error
     * - 'update': Update the existing event
     * - 'ignore': Silently ignore the duplicate
     * Default: 'reject'
     */
    onDuplicate?: "reject" | "update" | "ignore";
}
export interface UniquenessCriteria {
    $and?: Array<UniquenessCriteria | UniquenessField>;
    $or?: Array<UniquenessCriteria | UniquenessField>;
    $not?: UniquenessCriteria | UniquenessField;
    title?: boolean;
    description?: boolean;
    startTime?: boolean;
    endTime?: boolean;
    type?: boolean;
    repeat?: boolean;
    color?: boolean;
    resource?: boolean;
    customData?: boolean;
    user?: boolean;
    "user.email"?: boolean;
    "user.name"?: boolean;
    "user.identifier"?: boolean;
    [K: `customData.${string}`]: boolean;
    [K: `user.customData.${string}`]: boolean;
}
export interface UniquenessField {
    [key: string]: boolean;
}
export interface UpdateEventRequest {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    repeat?: string;
    type?: string;
    color?: string;
    resource?: string;
    custom_data?: Record<string, unknown>;
}
export interface CreateEventBatchRequest {
    events: CreateEventRequest[];
    options?: CreateEventBatchOptions;
}
export interface CreateEventBatchOptions {
    /**
     * Whether to stop processing if one event fails
     * Default: false (continue processing other events)
     */
    stopOnError?: boolean;
    /**
     * Whether to process events in parallel or sequentially
     * Default: 'parallel'
     */
    processingMode?: "parallel" | "sequential";
    /**
     * Maximum number of events to process in parallel
     * Only used when processingMode is 'parallel'
     * Default: 10
     */
    maxConcurrency?: number;
}
export interface CreateEventBatchResponse {
    success: boolean;
    results: CreateEventBatchResult[];
    summary: {
        total: number;
        successful: number;
        failed: number;
        skipped: number;
    };
}
export interface CreateEventBatchResult {
    index: number;
    success: boolean;
    event?: LoomCalEvent;
    error?: {
        message: string;
        code?: string;
        status?: number;
    };
}
export interface UpdateEventBatchRequest {
    updates: Array<{
        id: string;
        data: UpdateEventRequest;
    }>;
    options?: UpdateEventBatchOptions;
}
export interface UpdateEventBatchOptions {
    stopOnError?: boolean;
    processingMode?: "parallel" | "sequential";
    maxConcurrency?: number;
}
export interface UpdateEventBatchResponse {
    success: boolean;
    results: UpdateEventBatchResult[];
    summary: {
        total: number;
        successful: number;
        failed: number;
    };
}
export interface UpdateEventBatchResult {
    index: number;
    id: string;
    success: boolean;
    event?: LoomCalEvent;
    error?: {
        message: string;
        code?: string;
        status?: number;
    };
}
export interface DeleteEventBatchRequest {
    ids: string[];
    options?: DeleteEventBatchOptions;
}
export interface DeleteEventBatchOptions {
    stopOnError?: boolean;
    processingMode?: "parallel" | "sequential";
    maxConcurrency?: number;
}
export interface DeleteEventBatchResponse {
    success: boolean;
    results: DeleteEventBatchResult[];
    summary: {
        total: number;
        successful: number;
        failed: number;
    };
}
export interface DeleteEventBatchResult {
    index: number;
    id: string;
    success: boolean;
    error?: {
        message: string;
        code?: string;
        status?: number;
    };
}
//# sourceMappingURL=event.d.ts.map