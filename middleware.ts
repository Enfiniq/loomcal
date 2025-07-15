import { NextRequest, NextResponse } from "next/server";

// Define allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  const env = process.env.NODE_ENV;

  if (env === "development") {
    return [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ];
  }

  // In production, only allow specific domains
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
  return [
    "https://loomcal.neploom.com",
    "https://api.loomcal.neploom.com",
    "https://dashboard.loomcal.neploom.com",
    ...allowedOrigins,
  ];
};

// Security headers
const getSecurityHeaders = () => ({
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), location=()",
});

// CORS configuration
const setCORSHeaders = (
  response: NextResponse,
  origin: string | null
): void => {
  const allowedOrigins = getAllowedOrigins();

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Allow same-origin requests (no origin header)
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  response.headers.set("Access-Control-Allow-Credentials", "false"); // We use API keys, not cookies
};

// Rate limiting (simple in-memory store for demo)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (
  identifier: string,
  limit = 100,
  windowMs = 15 * 60 * 1000
): boolean => {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
};

// Helper functions to break down the complex middleware
function handleOptionsRequest(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  setCORSHeaders(response, request.headers.get("origin"));
  addSecurityHeaders(response);
  return response;
}

function addSecurityHeaders(response: NextResponse): void {
  Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

async function applyRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (apiKey) {
    // Rate limit by API key
    const rateLimitKey = `api_key:${apiKey.substring(0, 12)}`;
    if (!checkRateLimit(rateLimitKey, 1000, 15 * 60 * 1000)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please slow down your requests.",
        },
        { status: 429 }
      );
    }
  } else {
    // Rate limit by IP for unauthenticated requests
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = `ip:${clientIP}`;
    if (!checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please provide a valid API key.",
        },
        { status: 429 }
      );
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for non-API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    return handleOptionsRequest(request);
  }

  // Create response with security headers
  const response = NextResponse.next();
  setCORSHeaders(response, request.headers.get("origin"));
  addSecurityHeaders(response);

  // Skip auth for admin routes (they have their own auth)
  if (pathname.startsWith("/api/admin/")) {
    return response;
  }

  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    "/api/:path*", // All API routes
  ],
};
