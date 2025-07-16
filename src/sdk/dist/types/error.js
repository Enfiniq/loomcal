/**
 * Error handling type definitions
 */
export class LoomCalError extends Error {
    constructor(message, status = 0, response, code) {
        super(message);
        this.name = "LoomCalError";
        this.status = status;
        this.response = response;
        this.code = code;
    }
    static fromAxiosError(error) {
        const axiosError = error;
        if (axiosError.response) {
            const data = axiosError.response.data;
            const message = (data === null || data === void 0 ? void 0 : data.error) ||
                (data === null || data === void 0 ? void 0 : data.message) ||
                `HTTP ${axiosError.response.status}`;
            return new LoomCalError(message, axiosError.response.status, undefined, // Don't pass malformed data as ApiResponse
            axiosError.code);
        }
        if (axiosError.request) {
            return new LoomCalError("Network error - no response received", 0, undefined, axiosError.code);
        }
        return new LoomCalError(axiosError.message || "Unknown error", 0, undefined, axiosError.code);
    }
}
