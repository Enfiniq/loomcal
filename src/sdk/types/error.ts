/**
 * Error handling type definitions
 */

import { ApiResponse } from "./common";

export class LoomCalError extends Error {
  public status: number;
  public response?: ApiResponse;
  public code?: string;

  constructor(
    message: string,
    status: number = 0,
    response?: ApiResponse,
    code?: string
  ) {
    super(message);
    this.name = "LoomCalError";
    this.status = status;
    this.response = response;
    this.code = code;
  }

  static fromAxiosError(error: unknown): LoomCalError {
    const axiosError = error as {
      response?: {
        status: number;
        data?: Record<string, unknown>;
      };
      request?: unknown;
      message: string;
      code?: string;
    };

    if (axiosError.response) {
      const data = axiosError.response.data;
      const message =
        (data?.error as string) ||
        (data?.message as string) ||
        `HTTP ${axiosError.response.status}`;
      return new LoomCalError(
        message,
        axiosError.response.status,
        undefined, // Don't pass malformed data as ApiResponse
        axiosError.code
      );
    }

    if (axiosError.request) {
      return new LoomCalError(
        "Network error - no response received",
        0,
        undefined,
        axiosError.code
      );
    }

    return new LoomCalError(
      axiosError.message || "Unknown error",
      0,
      undefined,
      axiosError.code
    );
  }
}
