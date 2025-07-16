/**
 * Error handling type definitions
 */
import { ApiResponse } from "./common";
export declare class LoomCalError extends Error {
    status: number;
    response?: ApiResponse;
    code?: string;
    constructor(message: string, status?: number, response?: ApiResponse, code?: string);
    static fromAxiosError(error: unknown): LoomCalError;
}
//# sourceMappingURL=error.d.ts.map