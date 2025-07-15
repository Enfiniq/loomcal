import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createApiResponse, createErrorResponse } from "@/lib/api-middleware";
import { hashApiKey } from "@/lib/api-keys";
import type { BulkOperationRequest, BulkOperationResponse } from "@/sdk/types";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: BulkOperationRequest = await request.json();

    // Get API key from Authorization header
    const authHeader = request.headers.get("authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey) {
      return createErrorResponse("API key is required", 401);
    }

    // Validate request structure
    if (!body.operations || !Array.isArray(body.operations)) {
      return createErrorResponse("Operations array is required", 400);
    }

    if (body.operations.length === 0) {
      const emptyResponse: BulkOperationResponse = {
        success: true,
        results: [],
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
      return createApiResponse(emptyResponse, "No operations to process", 200);
    }

    // Validate operation types
    const validOperationTypes = [
      "createEvents",
      "getEvents",
      "updateEvents",
      "deleteEvents",
      "createUsers",
      "getUsers",
      "updateUsers",
      "deleteUsers",
    ];

    for (const operation of body.operations) {
      if (!validOperationTypes.includes(operation.type)) {
        return createErrorResponse(
          `Invalid operation type: ${operation.type}`,
          400
        );
      }
    }

    // Global options with defaults
    const globalOptions = {
      stopOnError: body.globalOptions?.stopOnError ?? false,
      transactional: body.globalOptions?.transactional ?? true,
    };

    // Hash the API key for database lookup
    const hashedApiKey = hashApiKey(apiKey);

    console.log("🔍 Calling stored procedure with:", {
      hashedApiKey: hashedApiKey.substring(0, 10) + "...",
      operationsCount: body.operations.length,
      operationTypes: body.operations.map((op) => op.type),
      globalOptions,
    });

    // Call the optimized bulk operations stored procedure
    const { data, error } = await supabaseAdmin.rpc(
      "process_bulk_operations_optimized",
      {
        p_api_key: hashedApiKey,
        p_operations: body.operations,
        p_global_options: globalOptions,
        p_endpoint: "/api/operations/bulk",
        p_method: "POST",
        p_request_start_time: startTime,
      }
    );

    if (error) {
      console.error("🚨 Bulk operations database error:", {
        error: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return createErrorResponse("Database processing failed", 500);
    }

    // Handle database response
    if (!data.success) {
      const statusCode = getStatusCodeFromError(data.error_code);
      return createErrorResponse(
        data.error || "Bulk operation failed",
        statusCode
      );
    }

    // Calculate final response time
    const executionTimeMs = Date.now() - startTime;

    // Success response
    return createApiResponse(
      {
        success: data.success,
        results: data.results || [],
        summary: {
          total: data.summary?.total || body.operations.length,
          successful: data.summary?.successful || 0,
          failed: data.summary?.failed || 0,
          executionTimeMs,
        },
      },
      `Bulk operation completed: ${data.summary?.successful || 0} successful, ${
        data.summary?.failed || 0
      } failed`,
      data.summary?.failed === 0 ? 200 : 207 // 207 = Multi-Status for partial success
    );
  } catch (error) {
    console.error("POST /api/operations/bulk error:", error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return createErrorResponse("Invalid JSON format", 400);
    }

    // Handle timeout errors
    const errorObj = error as { code?: string; message?: string };
    if (
      errorObj?.code === "ECONNABORTED" ||
      errorObj?.message?.includes("timeout")
    ) {
      return createErrorResponse("Request timeout", 408);
    }

    // Generic server error
    return createErrorResponse(
      "Internal server error during bulk operation processing",
      500
    );
  }
}

/**
 * Handle preflight OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Map error codes to HTTP status codes
 */
function getStatusCodeFromError(errorCode?: string): number {
  switch (errorCode) {
    case "INVALID_API_KEY":
    case "API_KEY_EXPIRED":
      return 401;

    case "INSUFFICIENT_PERMISSIONS":
      return 403;

    case "VALIDATION_ERROR":
    case "INVALID_OPERATION_TYPE":
    case "MISSING_REQUIRED_FIELDS":
      return 400;

    case "RESOURCE_NOT_FOUND":
    case "USER_NOT_FOUND":
    case "EVENT_NOT_FOUND":
      return 404;

    case "DUPLICATE_RESOURCE":
    case "DUPLICATE_EVENT":
    case "DUPLICATE_USER":
      return 409;

    case "RATE_LIMIT_EXCEEDED":
      return 429;

    case "DATABASE_ERROR":
    case "TRANSACTION_FAILED":
    case "PROCESSING_ERROR":
      return 500;

    case "REQUEST_TIMEOUT":
      return 408;

    default:
      return 500;
  }
}

/**
 * We only support POST for bulk operations
 */
export async function GET() {
  return createErrorResponse(
    "GET method not supported for bulk operations",
    405
  );
}

export async function PUT() {
  return createErrorResponse(
    "PUT method not supported for bulk operations",
    405
  );
}

export async function DELETE() {
  return createErrorResponse(
    "DELETE method not supported for bulk operations",
    405
  );
}
