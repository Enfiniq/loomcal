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
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from "axios";
import { LoomCalError, } from "./types";
// Import options merging utilities
import { mergeCreateOptions } from "./defaults";
// ===== CHAINABLE OPERATION QUEUE =====
class OperationQueue {
    constructor() {
        this.operations = [];
    }
    add(operation) {
        this.operations.push(operation);
    }
    getOperations() {
        return [...this.operations];
    }
    clear() {
        this.operations = [];
    }
    isEmpty() {
        return this.operations.length === 0;
    }
}
// ===== CHAINABLE SDK CLASS =====
export class LoomCal {
    constructor(config) {
        if (!config.apiKey) {
            throw new LoomCalError("API key is required", 400);
        }
        if (!config.apiKey.startsWith("lc_")) {
            throw new LoomCalError("Invalid API key format. API key must start with 'lc_'", 400);
        }
        this.config = {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl || "https://loomcal.neploom.com",
            timeout: config.timeout || 30000,
            retries: config.retries || 3,
            debug: config.debug || false,
        };
        this.client = axios.create({
            baseURL: `${this.config.baseUrl}/api`,
            timeout: this.config.timeout,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.config.apiKey}`,
                "User-Agent": "loomcal-sdk/1.0.0",
            },
        });
        this.operationQueue = new OperationQueue();
        this.setupInterceptors();
    }
    setupInterceptors() {
        // Request interceptor for debugging
        this.client.interceptors.request.use((config) => {
            var _a;
            if (this.config.debug) {
                console.log("LoomCal Request:", {
                    method: (_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase(),
                    url: config.url,
                    data: config.data,
                });
            }
            return config;
        }, (error) => Promise.reject(error));
        // Response interceptor for error handling and debugging
        this.client.interceptors.response.use((response) => {
            if (this.config.debug) {
                console.log("LoomCal Response:", {
                    status: response.status,
                    data: response.data,
                });
            }
            return response;
        }, async (error) => {
            var _a;
            if (this.config.debug) {
                const errorMessage = ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data)
                    ? JSON.stringify(error.response.data)
                    : (error === null || error === void 0 ? void 0 : error.message) || (error === null || error === void 0 ? void 0 : error.toString()) || "Unknown error";
                console.error("LoomCal Error:", errorMessage);
            }
            // Retry logic for network errors
            if (error.config && !error.config.__retryCount) {
                error.config.__retryCount = 0;
            }
            if (error.config &&
                error.config.__retryCount < this.config.retries &&
                this.shouldRetry(error)) {
                error.config.__retryCount++;
                await this.delay(Math.pow(2, error.config.__retryCount) * 1000);
                return this.client.request(error.config);
            }
            throw LoomCalError.fromAxiosError(error);
        });
    }
    shouldRetry(error) {
        const axiosError = error;
        return (axiosError.code === "ECONNABORTED" ||
            axiosError.code === "ENOTFOUND" ||
            axiosError.code === "ECONNRESET" ||
            !!(axiosError.response && axiosError.response.status >= 500));
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async request(config) {
        try {
            const response = await this.client.request(config);
            if (!response.data.success) {
                throw new LoomCalError(response.data.error || "Request failed", response.status, response.data);
            }
            return response.data.data;
        }
        catch (error) {
            if (error instanceof LoomCalError) {
                throw error;
            }
            throw LoomCalError.fromAxiosError(error);
        }
    }
    // ===== CORE CHAINABLE METHODS =====
    /**
     * Create one or more events
     * Supports single event, multiple events, defaultOptions, and chaining
     */
    createEvents(data, options) {
        // Process the data to handle options merging
        const processedData = this.processCreateEventData(data, options);
        this.operationQueue.add({
            type: "createEvents",
            data: processedData,
            options: undefined, // Options are now merged into the data items
        });
        return this;
    }
    /**
     * Process create event data to merge individual options with defaultOptions
     */
    processCreateEventData(data, chainOptions) {
        const defaultOptions = chainOptions === null || chainOptions === void 0 ? void 0 : chainOptions.defaultOptions;
        if (Array.isArray(data)) {
            return data.map((item) => this.mergeCreateEventOptions(item, defaultOptions));
        }
        else {
            return this.mergeCreateEventOptions(data, defaultOptions);
        }
    }
    /**
     * Merge individual event options with default options
     */
    mergeCreateEventOptions(item, defaultOptions) {
        const mergedOptions = mergeCreateOptions(item.options, defaultOptions);
        return Object.assign(Object.assign({}, item), { options: mergedOptions });
    }
    /**
     * Get events with filtering and pagination
     * Supports single query, multiple queries, and chaining
     */
    getEvents(data, options) {
        this.operationQueue.add({
            type: "getEvents",
            data,
            options,
        });
        return this;
    }
    /**
     * Update events by query or ID
     * Supports single update, multiple updates, and chaining
     */
    updateEvents(data, options) {
        this.operationQueue.add({
            type: "updateEvents",
            data,
            options,
        });
        return this;
    }
    /**
     * Delete events by query or ID
     * Supports single delete, multiple deletes, and chaining
     */
    deleteEvents(data, options) {
        this.operationQueue.add({
            type: "deleteEvents",
            data,
            options,
        });
        return this;
    }
    /**
     * Create one or more users
     * Supports single user, multiple users, and chaining
     */
    createUsers(data, options) {
        this.operationQueue.add({
            type: "createUsers",
            data,
            options,
        });
        return this;
    }
    /**
     * Get users with filtering and pagination
     * Supports single query, multiple queries, and chaining
     */
    getUsers(data, options) {
        this.operationQueue.add({
            type: "getUsers",
            data,
            options,
        });
        return this;
    }
    /**
     * Update users by query or ID
     * Supports single update, multiple updates, and chaining
     */
    updateUsers(data, options) {
        this.operationQueue.add({
            type: "updateUsers",
            data,
            options,
        });
        return this;
    }
    /**
     * Delete users by query or ID
     * Supports single delete, multiple deletes, and chaining
     */
    deleteUsers(data, options) {
        this.operationQueue.add({
            type: "deleteUsers",
            data,
            options,
        });
        return this;
    }
    // ===== CHAIN EXECUTION =====
    /**
     * Execute all queued operations as a single optimized bulk request
     */
    async execute() {
        if (this.operationQueue.isEmpty()) {
            return {
                operations: [],
                success: true,
                totalOperations: 0,
                successfulOperations: 0,
                failedOperations: 0,
            };
        }
        const operations = this.operationQueue.getOperations();
        this.operationQueue.clear();
        try {
            const bulkRequest = {
                operations,
                globalOptions: {
                    stopOnError: false,
                    transactional: true,
                },
            };
            const response = await this.request({
                method: "POST",
                url: "/operations/bulk",
                data: bulkRequest,
            });
            return {
                operations: response.results,
                success: response.success,
                totalOperations: response.summary.total,
                successfulOperations: response.summary.successful,
                failedOperations: response.summary.failed,
            };
        }
        catch (error) {
            if (this.config.debug) {
                console.error("Bulk operation failed:", error);
            }
            throw error;
        }
    }
    // ===== UTILITY METHODS =====
    /**
     * Check if a user exists by email or identifier
     */
    async userExists(emailOrId) {
        var _a, _b;
        try {
            const result = await this.getUsers([
                {
                    target: Object.assign({}, (emailOrId.includes("@")
                        ? { email: emailOrId }
                        : { identifier: emailOrId })),
                    options: { limit: 1 },
                },
            ]).execute();
            const userData = (_b = (_a = result.operations[0]) === null || _a === void 0 ? void 0 : _a.result) === null || _b === void 0 ? void 0 : _b.data;
            return Array.isArray(userData) ? userData.length > 0 : !!userData;
        }
        catch (error) {
            if (error instanceof LoomCalError && error.status === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Get today's events
     */
    async getTodaysEvents() {
        var _a, _b;
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const result = await this.getEvents([
            {
                target: {
                    startTime: { $gte: startOfDay.toISOString() },
                    endTime: { $lt: endOfDay.toISOString() },
                },
                options: {
                    sortBy: "startTime",
                    sortOrder: "asc",
                },
            },
        ]).execute();
        return ((_b = (_a = result.operations[0]) === null || _a === void 0 ? void 0 : _a.result) === null || _b === void 0 ? void 0 : _b.data) || [];
    }
}
// ===== FACTORY FUNCTIONS =====
/**
 * Create a new LoomCal client instance
 */
export function createLoomCalClient(config) {
    return new LoomCal(config);
}
/**
 * Create a LoomCal client with debug enabled
 */
export function createDebugLoomCalClient(config) {
    return new LoomCal(Object.assign(Object.assign({}, config), { debug: true }));
}
// ===== DEFAULT EXPORT =====
export default LoomCal;
// ===== RE-EXPORTS FOR CONVENIENCE =====
export { LoomCalError } from "./types";
// Export query operators for convenience
export { $gt, $gte, $lt, $lte, $eq, $ne, $in, $nin, $exists, $regex, $or, $and, $not, } from "./types";
// ===== VERSION INFO =====
export const VERSION = "1.0.0";
export const SDK_NAME = "loomcal";
