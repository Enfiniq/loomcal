import crypto from "crypto";

export function hashApiKey(apiKey: string): string {
  const secret = process.env.API_KEY_SECRET!;
  if (!secret) {
    throw new Error("API_KEY_SECRET environment variable is required");
  }

  return crypto.createHmac("sha256", secret).update(apiKey).digest("hex");
}
