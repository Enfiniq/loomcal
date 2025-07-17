export enum BotErrorType {
  PARSE_ERROR = "PARSE_ERROR",
  FLAG_ERROR = "FLAG_ERROR",
  DATA_ERROR = "DATA_ERROR",
  OBJECT_ERROR = "OBJECT_ERROR",
  COMMAND_ERROR = "COMMAND_ERROR",
  API_ERROR = "API_ERROR",
}

export interface BotError {
  type: BotErrorType;
  message: string;
  suggestion?: string;
}

export function createBotError(
  type: BotErrorType,
  message: string,
  suggestion?: string
): BotError {
  return { type, message, suggestion };
}

export const ERROR_MESSAGES = {
  INVALID_COMMAND: "🚫 Invalid command format",
  MISSING_API_KEY: "🔑 Missing API key",
  INVALID_API_KEY: "🚫 Invalid API key format",
  PARSE_FAILED: "❌ Failed to parse command",
  INVALID_JSON: "📝 Invalid JSON format",
  MISSING_FLAG: "🏳️ Required flag missing",
  INVALID_TIME: "⏰ Invalid time format",
  MISSING_TO_FLAG: "➡️ Missing -to flag for update",
  DELETE_CRITERIA_REQUIRED: "🗑️ Delete command requires selection criteria",
} as const;
