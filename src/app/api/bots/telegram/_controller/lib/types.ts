export interface ParsedFlags {
  [key: string]: string | number | boolean | Record<string, unknown>;
}

export interface ParsedOperator {
  operator: string;
  args: unknown[];
}

export interface ParsedOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isSigned?:
    | boolean
    | {
        check: boolean;
        createUser?: boolean;
        strict?: boolean;
      };
  savingRule?: {
    timeBetweenDuplicates?: number;
    uniquenessFields?: string[];
    onDuplicate?: "update" | "ignore" | "reject";
  };
}

export interface ParsedEventData {
  target: Record<string, unknown>;
  options: ParsedOptions;
}

export interface ParsedUpdateData {
  target: Record<string, unknown>;
  updates: Record<string, unknown>;
  options: ParsedOptions;
}

export interface ParsedDeleteData {
  target: Record<string, unknown>;
  options: ParsedOptions;
}

export interface TelegramMessage {
  update_id: number;
  message: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      type: string;
    };
    date: number;
    text: string;
  };
}

export interface UserConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

export interface UserInfo {
  first_name?: string;
  last_name?: string;
}
