import { OPERATORS } from "./constants";

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

// Default options for commands
export const DEFAULT_OPTIONS = {
  limit: 10,
  offset: 0,
  sortBy: "createdAt",
  sortOrder: "desc" as const,
  savingRule: {
    timeBetweenDuplicates: 0,
    uniquenessFields: [],
    onDuplicate: "ignore" as const,
  },
  isSigned: false,
};

/**
 * Normalize options by applying defaults
 */
export function normalizeOptions(input?: ParsedOptions | null): ParsedOptions {
  const rest = input || {};
  return {
    ...DEFAULT_OPTIONS,
    ...rest,
    savingRule: {
      ...DEFAULT_OPTIONS.savingRule,
      ...(rest.savingRule || {}),
    },
  };
}

/**
 * Convert normalized options to SDK-compatible create options
 */
export function toCreateOptions(options: ParsedOptions): {
  isSigned?: { check: boolean; createUser?: boolean; strict?: boolean };
  savingRule?: {
    timeBetweenDuplicates?: number;
    uniquenessFields?: string[];
    onDuplicate?: "update" | "ignore" | "reject";
  };
} {
  // Convert isSigned to SignedConfig object format
  let isSigned:
    | { check: boolean; createUser?: boolean; strict?: boolean }
    | undefined;
  if (typeof options.isSigned === "boolean") {
    isSigned = {
      check: options.isSigned,
      createUser: true,
      strict: false,
    };
  } else if (
    typeof options.isSigned === "object" &&
    options.isSigned !== null
  ) {
    isSigned = options.isSigned;
  }

  return {
    isSigned,
    savingRule: options.savingRule,
  };
}

/**
 * Convert normalized options to SDK-compatible operation options (get/update/delete)
 */
export function toOperationOptions(options: ParsedOptions): {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isSigned?: boolean;
} {
  // Convert complex isSigned object to simple boolean
  let isSigned: boolean | undefined;
  if (typeof options.isSigned === "boolean") {
    isSigned = options.isSigned;
  } else if (
    typeof options.isSigned === "object" &&
    options.isSigned !== null
  ) {
    isSigned = options.isSigned.check;
  }

  return {
    limit: options.limit,
    offset: options.offset,
    sortBy: options.sortBy,
    sortOrder: options.sortOrder,
    isSigned,
  };
}

/**
 * Extract flags from command text
 * Supports both -flag value and nested -flag -subflag value formats
 * Properly handles quoted values with spaces and multiline JSON objects
 */
export function extractFlags(text: string): ParsedFlags {
  const flags: ParsedFlags = {};

  // First, let's find all flag positions, but skip flags inside JSON objects
  const flagMatches: Array<{
    flag: string;
    subFlag?: string;
    startPos: number;
    valueStartPos: number;
    valueEndPos: number;
  }> = [];

  // Find all flag patterns, but we need to be smarter about JSON objects
  const flagPattern = /(-\w+)(?:\s+(-\w+))?/g;
  let match;

  while ((match = flagPattern.exec(text)) !== null) {
    const [fullMatch, mainFlag, subFlag] = match;
    const startPos = match.index;
    const valueStartPos = startPos + fullMatch.length;

    // Check if this flag is inside a JSON object by looking backwards
    let insideJSON = false;
    let braceLevel = 0;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < startPos; i++) {
      const char = text[i];

      // Handle string literals
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && text[i - 1] !== "\\") {
        inString = false;
        stringChar = "";
      }

      // Only count braces outside of strings
      if (!inString) {
        if (char === "{") {
          braceLevel++;
        } else if (char === "}") {
          braceLevel--;
        }
      }
    }

    // If we're inside unclosed braces, this flag is inside a JSON object
    if (braceLevel > 0) {
      insideJSON = true;
    }

    // Skip flags that are inside JSON objects
    if (insideJSON) {
      continue;
    }

    flagMatches.push({
      flag: mainFlag,
      subFlag,
      startPos,
      valueStartPos,
      valueEndPos: -1, // Will be set below
    });
  }

  // Determine value end positions
  for (let i = 0; i < flagMatches.length; i++) {
    const currentFlag = flagMatches[i];
    const nextFlag = flagMatches[i + 1];

    currentFlag.valueEndPos = nextFlag ? nextFlag.startPos : text.length;
  }

  // Extract values for each flag
  for (let i = 0; i < flagMatches.length; i++) {
    const currentFlag = flagMatches[i];

    // Extract the value portion
    const valueText = text
      .slice(currentFlag.valueStartPos, currentFlag.valueEndPos)
      .trim();

    // Handle different value types
    let cleanValue: string;

    if (valueText.startsWith("{")) {
      // Handle JSON objects (including multiline)
      const braceBalance = extractBalancedBraces(valueText, 0);
      if (braceBalance !== null) {
        cleanValue = braceBalance;
      } else {
        cleanValue = valueText;
      }
    } else if (
      (valueText.startsWith('"') && valueText.includes('"', 1)) ||
      (valueText.startsWith("'") && valueText.includes("'", 1))
    ) {
      // Handle quoted strings
      const quote = valueText[0];
      const endQuoteIndex = valueText.indexOf(quote, 1);
      if (endQuoteIndex !== -1) {
        cleanValue = valueText.slice(1, endQuoteIndex);
      } else {
        cleanValue = valueText.slice(1);
      }
    } else {
      // Handle unquoted values (stop at next flag or end)
      cleanValue = valueText.split(/\s+-\w+/)[0].trim();
    }

    // Store the flag value
    if (currentFlag.subFlag) {
      // Nested flag like -rt -s value
      if (!flags[currentFlag.flag]) flags[currentFlag.flag] = {};
      (flags[currentFlag.flag] as Record<string, unknown>)[
        currentFlag.subFlag
      ] = parseValue(cleanValue);
    } else {
      // Simple flag like -t value
      flags[currentFlag.flag] = parseValue(cleanValue);
    }
  }

  return flags;
}

/**
 * Extract content between balanced braces starting at openBraceIndex
 */
function extractBalancedBraces(
  text: string,
  openBraceIndex: number
): string | null {
  let level = 0;
  let i = openBraceIndex;
  let inString = false;
  let stringChar = "";

  while (i < text.length) {
    const char = text[i];

    // Handle string literals
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && text[i - 1] !== "\\") {
      inString = false;
      stringChar = "";
    }

    // Only count braces outside of strings
    if (!inString) {
      if (char === "{") {
        level++;
      } else if (char === "}") {
        level--;
        if (level === 0) {
          // Found the matching closing brace
          return text.slice(openBraceIndex, i + 1);
        }
      }
    }
    i++;
  }

  // No matching closing brace found
  return null;
}

/**
 * Extract enhanced operators from command text
 * Supports both formats:
 * - Field-outside: -field $operator(args)
 * - Sequential/default: $operator(args) (applies to default field)
 */
export function extractOperators(text: string): ParsedOperator[] {
  const operators: ParsedOperator[] = [];

  // Pattern 1: Field-outside format: -field $operator(args)
  const fieldOutsidePattern = /(-\w+)\s+\$(\w+)\(/g;
  let fieldMatch;

  while ((fieldMatch = fieldOutsidePattern.exec(text)) !== null) {
    const [fullMatch, flag, operatorName] = fieldMatch;
    const fullOperatorName = `$${operatorName}`;

    const startIndex = fieldMatch.index + fullMatch.length - 1; // Position of opening (

    // Extract content between balanced parentheses
    const argsStr = extractBalancedParens(text, startIndex);
    if (argsStr === null) continue;

    if (
      Object.values(OPERATORS).includes(
        fullOperatorName as (typeof OPERATORS)[keyof typeof OPERATORS]
      )
    ) {
      const args = parseEnhancedOperatorArgs(argsStr, flag);
      operators.push({
        operator: fullOperatorName,
        args,
      });
    }
  }

  // Pattern 2: Sequential/default format: $operator(args) - applies to default field (title)
  // But skip operators that are nested inside other operators
  const sequentialPattern = /(?:^|\s)\$(\w+)\(/g;
  let sequentialMatch: RegExpExecArray | null;

  while ((sequentialMatch = sequentialPattern.exec(text)) !== null) {
    const [fullMatch, operatorName] = sequentialMatch;
    const fullOperatorName = `$${operatorName}`;

    // Check if this operator is nested inside another operator's parentheses
    const matchStart = sequentialMatch.index;
    let isNested = false;

    // Look for any opening parentheses before this match that don't have closing parentheses
    let parenCount = 0;
    for (let i = 0; i < matchStart; i++) {
      if (text[i] === "(") parenCount++;
      else if (text[i] === ")") parenCount--;
    }

    // If we're inside unclosed parentheses, this operator is nested
    if (parenCount > 0) {
      isNested = true;
    }

    // Skip if this operator is nested inside another operator
    if (isNested) continue;

    // Skip if this was already matched by field-outside pattern
    const alreadyMatched = operators.some((op) => {
      const matchEnd = matchStart + fullMatch.length;
      return (
        text.substring(matchStart, matchEnd) === fullMatch &&
        op.operator === fullOperatorName
      );
    });

    if (alreadyMatched) continue;

    const startIndex = sequentialMatch.index + fullMatch.length - 1; // Position of opening (

    // Extract content between balanced parentheses
    const argsStr = extractBalancedParens(text, startIndex);
    if (argsStr === null) continue;

    if (
      Object.values(OPERATORS).includes(
        fullOperatorName as (typeof OPERATORS)[keyof typeof OPERATORS]
      )
    ) {
      // For sequential operators, use default field (title)
      const args = parseEnhancedOperatorArgs(argsStr, "-t");
      operators.push({
        operator: fullOperatorName,
        args,
      });
    }
  }

  return operators;
}

/**
 * Parse enhanced operator arguments for all operators
 * Handles nested operators and various value types
 * Now supports $and/$or with field-outside format: -field $and(condition1, condition2)
 */
function parseEnhancedOperatorArgs(argsStr: string, field: string): unknown[] {
  if (!argsStr.trim()) {
    return [field, ""];
  }

  // Handle $and/$or operators - they take multiple conditions
  if (field && (argsStr.includes("$") || argsStr.includes(","))) {
    // Check if args contain nested operators like $regex("value"), $ne("value")
    const nestedOperatorPattern = /\$(\w+)\(([^)]*)\)/g;
    const nestedMatches = Array.from(argsStr.matchAll(nestedOperatorPattern));

    if (nestedMatches.length > 0) {
      // Multi-arg operator with nested operators
      const parsedArgs = nestedMatches.map((match) => {
        const [, operatorName, valueStr] = match;
        const value = parseValue(valueStr.replace(/^["']|["']$/g, "")); // Remove quotes
        return { [`$${operatorName}`]: value };
      });
      return [field, parsedArgs];
    }

    // Handle comma-separated values for multi-arg operators ($and, $or, $in, $nin)
    if (argsStr.includes(",")) {
      const values = argsStr
        .split(",")
        .map((arg) => parseValue(arg.trim().replace(/^["']|["']$/g, "")));
      return [field, values];
    }
  }

  // Single value - remove quotes if present
  const value = parseValue(argsStr.replace(/^["']|["']$/g, ""));
  return [field, value];
}

/**
 * Extract content between balanced parentheses starting at openParenIndex
 */
function extractBalancedParens(
  text: string,
  openParenIndex: number
): string | null {
  let level = 0;
  let i = openParenIndex;

  while (i < text.length) {
    const char = text[i];
    if (char === "(") {
      level++;
    } else if (char === ")") {
      level--;
      if (level === 0) {
        // Found the matching closing parenthesis
        return text.slice(openParenIndex + 1, i);
      }
    }
    i++;
  }

  // No matching closing parenthesis found
  return null;
}

/**
 * Extract options from command text
 * Supports both -o flag and last sequential argument (if it looks like an options object)
 */
export function extractOptions(text: string): ParsedOptions | null {
  // First try to extract from -o flag
  const flags = extractFlags(text);

  if (flags["-o"]) {
    if (typeof flags["-o"] === "object") {
      return flags["-o"] as ParsedOptions;
    }
  }

  // Then try to extract from last sequential argument
  // But we need to extract sequence WITHOUT removing options first
  const sequence = extractSequenceWithOptions(text);

  if (sequence.length > 0) {
    const lastArg = sequence[sequence.length - 1];

    // Check if last argument looks like an options object
    if (lastArg.startsWith("{") && lastArg.endsWith("}")) {
      try {
        const parsed = parseValue(lastArg);
        if (typeof parsed === "object" && parsed !== null) {
          // Validate that it contains option-like properties
          const obj = parsed as Record<string, unknown>;
          const validOptionKeys = [
            "limit",
            "offset",
            "sortBy",
            "sortOrder",
            "isSigned",
            "savingRule",
          ];

          const hasValidOptionKey = Object.keys(obj).some((key) =>
            validOptionKeys.includes(key)
          );

          if (hasValidOptionKey) {
            return obj as ParsedOptions;
          }
        }
      } catch {
        // Not a valid options object
      }
    }
  }

  return null;
}

/**
 * Extract filter object from command text
 * Supports both -f flag and second to last sequential argument (if it looks like a filter object)
 * This is specifically for get, update, and delete commands
 */
export function extractFilter(text: string): Record<string, unknown> | null {
  // First try to extract from -f flag
  const flags = extractFlags(text);

  if (flags["-f"]) {
    if (typeof flags["-f"] === "object") {
      return flags["-f"] as Record<string, unknown>;
    }
  }

  // Then try to extract from second to last sequential argument
  const sequence = extractSequenceWithOptions(text);

  if (sequence.length >= 2) {
    const secondLastArg = sequence[sequence.length - 2];

    // Check if second to last argument looks like a filter object
    if (secondLastArg.startsWith("{") && secondLastArg.endsWith("}")) {
      try {
        const parsed = parseValue(secondLastArg);
        if (typeof parsed === "object" && parsed !== null) {
          // For filters, we don't validate specific keys since they can be any MongoDB query
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Not a valid filter object
      }
    }
  }

  return null;
}

/**
 * Parse sequence arguments from command text
 * Returns arguments in the order they appear (non-flag arguments)
 * Properly handles quoted strings as single arguments
 * Excludes the last argument if it's detected as an options object
 */
/**
 * Extract sequential arguments including options (used for options extraction)
 */
function extractSequenceWithOptions(text: string): string[] {
  // Remove the command itself
  const commandPattern = /^\/\w+\s*/;
  let cleanText = text.replace(commandPattern, "");

  // We need to remove flags but preserve multiline JSON objects
  // First, let's find all flag positions using the same logic as extractFlags
  const flagMatches: Array<{
    flag: string;
    subFlag?: string;
    startPos: number;
    valueStartPos: number;
    valueEndPos: number;
  }> = [];

  // Find all flag patterns
  const flagPattern = /(-\w+)(?:\s+(-\w+))?/g;
  let match;

  while ((match = flagPattern.exec(cleanText)) !== null) {
    const [fullMatch, mainFlag, subFlag] = match;
    const startPos = match.index;
    const valueStartPos = startPos + fullMatch.length;

    flagMatches.push({
      flag: mainFlag,
      subFlag,
      startPos,
      valueStartPos,
      valueEndPos: -1, // Will be set below
    });
  }

  // Determine value end positions
  for (let i = 0; i < flagMatches.length; i++) {
    const currentFlag = flagMatches[i];
    const nextFlag = flagMatches[i + 1];

    currentFlag.valueEndPos = nextFlag ? nextFlag.startPos : cleanText.length;
  }

  // Remove flags and their values from back to front to preserve indices
  for (let i = flagMatches.length - 1; i >= 0; i--) {
    const flagMatch = flagMatches[i];
    cleanText =
      cleanText.slice(0, flagMatch.startPos) +
      cleanText.slice(flagMatch.valueEndPos);
  }

  cleanText = cleanText.trim();

  if (!cleanText) return [];

  // Parse remaining arguments respecting quotes (these should be positional args only)
  const args: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let argMatch;

  while ((argMatch = regex.exec(cleanText)) !== null) {
    // match[1] = double quoted content
    // match[2] = single quoted content
    // match[3] = unquoted content
    const arg = argMatch[1] || argMatch[2] || argMatch[3];
    if (arg) {
      args.push(arg);
    }
  }

  // Return all args including potential options object
  return args;
}

/**
 * Extract sequential arguments (excludes options object if present)
 */
export function extractSequence(text: string): string[] {
  // Remove the command itself
  const commandPattern = /^\/\w+\s*/;
  let cleanText = text.replace(commandPattern, "");

  // We need to remove flags but preserve multiline JSON objects
  // First, let's find all flag positions using the same logic as extractFlags
  const flagMatches: Array<{
    flag: string;
    subFlag?: string;
    startPos: number;
    valueStartPos: number;
    valueEndPos: number;
  }> = [];

  // Find all flag patterns
  const flagPattern = /(-\w+)(?:\s+(-\w+))?/g;
  let match;

  while ((match = flagPattern.exec(cleanText)) !== null) {
    const [fullMatch, mainFlag, subFlag] = match;
    const startPos = match.index;
    const valueStartPos = startPos + fullMatch.length;

    flagMatches.push({
      flag: mainFlag,
      subFlag,
      startPos,
      valueStartPos,
      valueEndPos: -1, // Will be set below
    });
  }

  // Determine value end positions
  for (let i = 0; i < flagMatches.length; i++) {
    const currentFlag = flagMatches[i];
    const nextFlag = flagMatches[i + 1];

    currentFlag.valueEndPos = nextFlag ? nextFlag.startPos : cleanText.length;
  }

  // Remove flags and their values from back to front to preserve indices
  for (let i = flagMatches.length - 1; i >= 0; i--) {
    const flagMatch = flagMatches[i];
    cleanText =
      cleanText.slice(0, flagMatch.startPos) +
      cleanText.slice(flagMatch.valueEndPos);
  }

  cleanText = cleanText.trim();

  if (!cleanText) return [];

  // Parse remaining arguments respecting quotes (these should be positional args only)
  const args: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let argMatch;

  while ((argMatch = regex.exec(cleanText)) !== null) {
    // match[1] = double quoted content
    // match[2] = single quoted content
    // match[3] = unquoted content
    const arg = argMatch[1] || argMatch[2] || argMatch[3];
    if (arg) {
      args.push(arg);
    }
  }

  // Check if the last arguments are filter/options objects and remove them if so
  if (args.length > 0) {
    // Check if last argument is an options object
    const lastArg = args[args.length - 1];
    if (lastArg.startsWith("{") && lastArg.endsWith("}")) {
      try {
        const parsed = parseValue(lastArg);
        if (typeof parsed === "object" && parsed !== null) {
          // Validate that it contains option-like properties
          const obj = parsed as Record<string, unknown>;
          const validOptionKeys = [
            "limit",
            "offset",
            "sortBy",
            "sortOrder",
            "isSigned",
            "savingRule",
          ];

          const hasValidOptionKey = Object.keys(obj).some((key) =>
            validOptionKeys.includes(key)
          );

          if (hasValidOptionKey) {
            // Remove the options object from sequence
            args.pop();
          }
        }
      } catch {
        // Not a valid options object, keep it in sequence
      }
    }
  }

  // Check if the now-last argument is a filter object and remove it if so
  if (args.length > 0) {
    const lastArg = args[args.length - 1];
    if (lastArg.startsWith("{") && lastArg.endsWith("}")) {
      try {
        const parsed = parseValue(lastArg);
        if (typeof parsed === "object" && parsed !== null) {
          // For filters, we don't validate specific keys since they can be any MongoDB query
          // But we should remove it from the sequence as it's not a regular argument
          args.pop();
        }
      } catch {
        // Not a valid filter object, keep it in sequence
      }
    }
  }

  return args;
}

/**
 * Parse value to appropriate type
 */
function parseValue(
  value: string
): string | number | boolean | Record<string, unknown> {
  if (!value) return "";

  // Try to parse as number
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }

  if (/^\d*\.?\d+$/.test(value)) {
    return parseFloat(value);
  }

  // Try to parse as boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Try to parse as JSON object
  if (value.startsWith("{") && value.endsWith("}")) {
    try {
      // First try direct JSON parsing
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      try {
        // If that fails, try to fix common JS object notation issues
        // Convert unquoted property names to quoted ones
        const fixedJson = value.replace(
          /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
          '$1"$2":'
        );
        return JSON.parse(fixedJson) as Record<string, unknown>;
      } catch {
        // If still fails, return as string
        return value;
      }
    }
  }

  return value;
}

/**
 * Convert relative time to absolute time
 */
export function convertRelativeTime(minutes: number): string {
  const now = new Date();
  const targetTime = new Date(now.getTime() + minutes * 60000);
  return targetTime.toISOString();
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): boolean {
  return typeof apiKey === "string" && apiKey.startsWith("lc_");
}
