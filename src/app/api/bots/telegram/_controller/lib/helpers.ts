import { OPERATORS } from "@/app/api/bots/telegram/_controller/lib/constants";
import { extractFlags } from "@/app/api/bots/telegram/_controller/lib/flags";
import { parseValue } from "@/app/api/bots/telegram/_controller/lib/parsers";
import { separateCombinedJSONObjects } from "@/app/api/bots/telegram/_controller/lib/utils";
import { ParsedFlags, ParsedOptions } from "@/app/api/bots/telegram/_controller/lib/types";

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

export function toCreateOptions(options: ParsedOptions): {
  isSigned?: { check: boolean; createUser?: boolean; strict?: boolean };
  savingRule?: {
    timeBetweenDuplicates?: number;
    uniquenessFields?: string[];
    onDuplicate?: "update" | "ignore" | "reject";
  };
} {
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

export function toOperationOptions(options: ParsedOptions): {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isSigned?: boolean;
} {
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

export function extractOptions(text: string): ParsedOptions | null {
  const flags = extractFlags(text);

  if (flags["-o"]) {
    if (typeof flags["-o"] === "object") {
      return flags["-o"] as ParsedOptions;
    }
  }

  const sequence = extractSequenceWithOptions(text);

  if (sequence.length > 0) {
    const lastArg = sequence[sequence.length - 1];

    if (lastArg.startsWith("{") && lastArg.endsWith("}")) {
      if (lastArg.includes("} {")) {
        const separated = separateCombinedJSONObjects(lastArg);

        for (const obj of separated) {
          if (obj.startsWith("{") && obj.endsWith("}")) {
            try {
              const parsed = parseValue(obj);
              if (typeof parsed === "object" && parsed !== null) {
                const objData = parsed as Record<string, unknown>;
                const validOptionKeys = [
                  "limit",
                  "offset",
                  "sortBy",
                  "sortOrder",
                  "isSigned",
                  "savingRule",
                ];

                const hasValidOptionKey = Object.keys(objData).some((key) =>
                  validOptionKeys.includes(key)
                );

                if (hasValidOptionKey) {
                  return objData as ParsedOptions;
                }
              }
            } catch {
              // Not a valid options object, continue
            }
          }
        }
      } else {
        try {
          const parsed = parseValue(lastArg);
          if (typeof parsed === "object" && parsed !== null) {
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
  }

  return null;
}

export function extractFilter(text: string): Record<string, unknown> | null {
  // First try to extract from -f flag
  const flags = extractFlags(text);

  if (flags["-f"]) {
    if (typeof flags["-f"] === "object") {
      return flags["-f"] as Record<string, unknown>;
    }
  }

  const sequence = extractSequenceWithOptions(text);

  if (sequence.length >= 2) {
    const secondLastArg = sequence[sequence.length - 2];

    if (secondLastArg.startsWith("{") && secondLastArg.endsWith("}")) {
      try {
        const parsed = parseValue(secondLastArg);
        if (typeof parsed === "object" && parsed !== null) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Not a valid filter object
      }
    }
  }

  return null;
}

function extractSequenceWithOptions(text: string): string[] {
  // Remove the command itself
  const commandPattern = /^\/\w+\s*/;
  let cleanText = text.replace(commandPattern, "");

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
      valueEndPos: -1,
    });
  }

  for (let i = 0; i < flagMatches.length; i++) {
    const currentFlag = flagMatches[i];
    const nextFlag = flagMatches[i + 1];

    currentFlag.valueEndPos = nextFlag ? nextFlag.startPos : cleanText.length;
  }

  for (let i = flagMatches.length - 1; i >= 0; i--) {
    const flagMatch = flagMatches[i];
    cleanText =
      cleanText.slice(0, flagMatch.startPos) +
      cleanText.slice(flagMatch.valueEndPos);
  }

  cleanText = cleanText.trim();

  if (!cleanText) return [];

  const args: string[] = [];
  let i = 0;

  while (i < cleanText.length) {
    while (i < cleanText.length && /\s/.test(cleanText[i])) {
      i++;
    }

    if (i >= cleanText.length) break;

    let arg = "";
    const startChar = cleanText[i];

    if (startChar === '"') {
      i++; 
      while (i < cleanText.length && cleanText[i] !== '"') {
        if (cleanText[i] === "\\" && i + 1 < cleanText.length) {
          arg += cleanText[i + 1];
          i += 2;
        } else {
          arg += cleanText[i];
          i++;
        }
      }
      if (i < cleanText.length) i++;
    } else if (startChar === "'") {
      i++;
      while (i < cleanText.length && cleanText[i] !== "'") {
        if (cleanText[i] === "\\" && i + 1 < cleanText.length) {
          arg += cleanText[i + 1];
          i += 2;
        } else {
          arg += cleanText[i];
          i++;
        }
      }
      if (i < cleanText.length) i++;
    } else if (startChar === "{") {
      let braceLevel = 0;
      let inString = false;
      let stringChar = "";
      let escapeNext = false;

      while (i < cleanText.length) {
        const char = cleanText[i];

        if (escapeNext) {
          escapeNext = false;
          arg += char;
          i++;
          continue;
        }

        if (char === "\\") {
          escapeNext = true;
          arg += char;
          i++;
          continue;
        }

        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          inString = false;
          stringChar = "";
        }

        if (!inString) {
          if (char === "{") {
            braceLevel++;
          } else if (char === "}") {
            braceLevel--;
          }
        }

        arg += char;
        i++;

        if (braceLevel === 0) {
          break;
        }
      }
    } else {
      while (
        i < cleanText.length &&
        !/\s/.test(cleanText[i]) &&
        cleanText[i] !== "{" &&
        cleanText[i] !== '"' &&
        cleanText[i] !== "'"
      ) {
        arg += cleanText[i];
        i++;
      }
    }

    if (arg) {
      args.push(arg);
    }
  }

  return args;
}

export function convertRelativeTime(minutes: number): string {
  const now = new Date();
  const targetTime = new Date(now.getTime() + minutes * 60000);
  return targetTime.toISOString();
}

export function parseTimeFlags(flags: ParsedFlags): {
  startTime?: string | Record<string, unknown>;
  endTime?: string | Record<string, unknown>;
} {
  const result: {
    startTime?: string | Record<string, unknown>;
    endTime?: string | Record<string, unknown>;
  } = {};

  // Process -rt flag
  if (flags["-rt"]) {
    const rtValue = flags["-rt"];

    if (typeof rtValue === "object" && rtValue !== null) {
      const rtObj = rtValue as Record<string, unknown>;

      if (rtObj["-s"] !== undefined) {
        const startValue = rtObj["-s"];
        const startTime = parseTimeWithOperator(startValue, true); 
        if (startTime) result.startTime = startTime;
      }

      if (rtObj["-e"] !== undefined) {
        const endValue = rtObj["-e"];
        const endTime = parseTimeWithOperator(endValue, true); 
        if (endTime) result.endTime = endTime;
      }
    } else if (typeof rtValue === "string") {
      if (rtValue.trim().match(/^\$\w+\([^)]*\)$/)) {
        const startTime = parseTimeWithOperator(rtValue, true);
        if (startTime) result.startTime = startTime;
      } else {
        const operators = extractTimeOperators(rtValue, true);
        if (operators.length > 0) {
          if (operators[0]) result.startTime = operators[0];
          if (operators[1]) result.endTime = operators[1];
        } else {
          const values = rtValue.trim().split(/\s+/);
          if (values.length >= 1) {
            const startMinutes = parseTimeValue(values[0]);
            result.startTime = convertRelativeTime(startMinutes);
          }
          if (values.length >= 2) {
            const endMinutes = parseTimeValue(values[1]);
            result.endTime = convertRelativeTime(endMinutes);
          }
        }
      }
    } else {
      const startTime = parseTimeWithOperator(rtValue, true);
      if (startTime) result.startTime = startTime;
    }
  }

  // Handle -at (absolute time) flag
  if (flags["-at"]) {
    const atValue = flags["-at"];

    if (typeof atValue === "object" && atValue !== null) {
      const atObj = atValue as Record<string, unknown>;

      if (atObj["-s"] !== undefined) {
        const startValue = atObj["-s"];
        const startTime = parseTimeWithOperator(startValue, false); 
        if (startTime) result.startTime = startTime;
      }

      if (atObj["-e"] !== undefined) {
        const endValue = atObj["-e"];
        const endTime = parseTimeWithOperator(endValue, false); 
        if (endTime) result.endTime = endTime;
      }
    } else if (typeof atValue === "string") {
      if (atValue.trim().match(/^\$\w+\([^)]*\)$/)) {
        const startTime = parseTimeWithOperator(atValue, false);
        if (startTime) result.startTime = startTime;
      } else {
        const operators = extractTimeOperators(atValue, false); 
        if (operators.length > 0) {
          if (operators[0]) result.startTime = operators[0];
          if (operators[1]) result.endTime = operators[1];
        } else {
          const values = atValue.trim().split(/\s+/);
          if (values.length >= 1) {
            result.startTime = parseAbsoluteTime(values[0]);
          }
          if (values.length >= 2) {
            result.endTime = parseAbsoluteTime(values[1]);
          }
        }
      }
    } else {
      const startTime = parseTimeWithOperator(atValue, false);
      if (startTime) result.startTime = startTime;
    }
  }

  return result;
}

function parseTimeWithOperator(
  value: unknown,
  isRelative: boolean
): string | Record<string, unknown> | null {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.includes("$")) {
      const operatorMatch = trimmed.match(/\$(\w+)\(([^)]*)\)/);

      if (operatorMatch) {
        const [, operatorName, operatorValue] = operatorMatch;
        const fullOperatorName = `$${operatorName}`;

        if (
          Object.values(OPERATORS).includes(
            fullOperatorName as (typeof OPERATORS)[keyof typeof OPERATORS]
          )
        ) {
          let processedValue: string;
          if (isRelative) {
            const minutes = parseTimeValue(operatorValue);
            processedValue = convertRelativeTime(minutes);
          } else {
            processedValue = parseAbsoluteTime(operatorValue);
          }

          const operatorResult = { [fullOperatorName]: processedValue };
          return operatorResult;
        }
      }
    }

    if (isRelative) {
      const minutes = parseTimeValue(value);
      return convertRelativeTime(minutes);
    } else {
      return parseAbsoluteTime(value);
    }
  }

  if (isRelative) {
    const minutes = parseTimeValue(value);
    return convertRelativeTime(minutes);
  } else {
    return parseAbsoluteTime(value);
  }
}

function extractTimeOperators(
  text: string,
  isRelative: boolean
): Array<Record<string, unknown>> {
  const operators: Array<Record<string, unknown>> = [];

  const operatorPattern = /\$(\w+)\(([^)]*)\)/g;
  let match;

  while ((match = operatorPattern.exec(text)) !== null) {
    const [, operatorName, operatorValue] = match;
    const fullOperatorName = `$${operatorName}`;

    if (
      Object.values(OPERATORS).includes(
        fullOperatorName as (typeof OPERATORS)[keyof typeof OPERATORS]
      )
    ) {
      let processedValue: string;
      if (isRelative) {
        const minutes = parseTimeValue(operatorValue);
        processedValue = convertRelativeTime(minutes);
      } else {
        processedValue = parseAbsoluteTime(operatorValue);
      }

      operators.push({ [fullOperatorName]: processedValue });
    }
  }

  return operators;
}

function parseTimeValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.startsWith("!")) {
      const numStr = trimmed.substring(1);
      const num = parseFloat(numStr);
      return isNaN(num) ? 0 : -Math.abs(num); 
    }

    const num = parseFloat(trimmed);
    return isNaN(num) ? 0 : num;
  }

  return 0;
}

function parseAbsoluteTime(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();

    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      return new Date().toISOString();
    }
  }

  return new Date().toISOString();
}

export function extractTimeValues(
  flags: ParsedFlags,
  sequence: string[],
  startIndex: number
): {
  startTime?: string | Record<string, unknown>;
  endTime?: string | Record<string, unknown>;
  nextIndex: number;
} {
  const timeFromFlags = parseTimeFlags(flags);

  if (timeFromFlags.startTime || timeFromFlags.endTime) {
    return {
      ...timeFromFlags,
      nextIndex: startIndex,
    };
  }
  const result: {
    startTime?: string | Record<string, unknown>;
    endTime?: string | Record<string, unknown>;
    nextIndex: number;
  } = {
    nextIndex: startIndex,
  };

  if (sequence.length > startIndex) {
    const startValue = sequence[startIndex];

    try {
      const date = new Date(startValue);

      if (
        (!isNaN(date.getTime()) && startValue.includes("-")) ||
        startValue.includes("T")
      ) {
        result.startTime = date.toISOString();
        result.nextIndex = startIndex + 1;
      } else {
        const minutes = parseTimeValue(startValue);
        result.startTime = convertRelativeTime(minutes);
        result.nextIndex = startIndex + 1;
      }
    } catch {
      const minutes = parseTimeValue(startValue);
      result.startTime = convertRelativeTime(minutes);
      result.nextIndex = startIndex + 1;
    }

    if (sequence.length > result.nextIndex) {
      const endValue = sequence[result.nextIndex];

      try {
        const date = new Date(endValue);

        if (
          !isNaN(date.getTime()) &&
          (endValue.includes("-") || endValue.includes("T"))
        ) {
          result.endTime = date.toISOString();
          result.nextIndex++;
        } else {
          const minutes = parseTimeValue(endValue);
          result.endTime = convertRelativeTime(minutes);
          result.nextIndex++;
        }
      } catch {
        const minutes = parseTimeValue(endValue);
        result.endTime = convertRelativeTime(minutes);
        result.nextIndex++;
      }
    }
  }

  return result;
}

export function validateApiKey(apiKey: string): boolean {
  return typeof apiKey === "string" && apiKey.startsWith("lc_");
}
