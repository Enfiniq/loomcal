import { ParsedOperator } from "@/app/api/bots/telegram/_controller/lib/types";
import {
  OPERATORS,
  SINGLE_ARG_OPERATORS,
  MULTI_ARG_OPERATORS,
  DOCUMENT_LEVEL_OPERATORS,
} from "@/app/api/bots/telegram/_controller/lib/constants";
import { parseValue } from "@/app/api/bots/telegram/_controller/lib/parsers";
import { convertRelativeTime } from "@/app/api/bots/telegram/_controller/lib/helpers";

export function parseOperatorArgs(argsStr: string): unknown[] {
  if (argsStr.includes(",")) {
    return argsStr
      .split(",")
      .map((arg) => parseValue(arg.trim().replace(/^["']|["']$/g, "")));
  }

  return [parseValue(argsStr.replace(/^["']|["']$/g, ""))];
}

export function parseTopLevelOperators(content: string): string[] {
  const operators: string[] = [];
  let i = 0;

  while (i < content.length) {
    while (i < content.length && /\s/.test(content[i])) {
      i++;
    }

    if (i >= content.length) break;

    if (content[i] === "$") {
      const operatorStart = i;

      while (i < content.length && /[a-zA-Z]/.test(content[i + 1])) {
        i++;
      }
      i++;

      while (i < content.length && /\s/.test(content[i])) {
        i++;
      }

      if (i < content.length && content[i] === "(") {
        let depth = 1;
        i++;

        while (i < content.length && depth > 0) {
          if (content[i] === "(") {
            depth++;
          } else if (content[i] === ")") {
            depth--;
          }
          i++;
        }

        const operatorStr = content.substring(operatorStart, i);
        operators.push(operatorStr);
      } else {
        i++;
      }
    } else {
      // Not an operator, skip this character
      i++;
    }
  }

  return operators;
}

export function parseTimeOperatorArgs(
  argsStr: string,
  isRelative: boolean
): unknown[] {
  if (argsStr.includes(",")) {
    return argsStr.split(",").map((arg) => {
      const trimmed = arg.trim().replace(/^["']|["']$/g, "");

      const operatorMatch = trimmed.match(/^\$(\w+)\((.+)\)$/);
      if (operatorMatch) {
        const [, operatorName, nestedArgsStr] = operatorMatch;
        const fullOperator = `$${operatorName}`;

        const nestedArgs = parseTimeOperatorArgs(nestedArgsStr, isRelative);

        if (
          SINGLE_ARG_OPERATORS.includes(
            fullOperator as (typeof SINGLE_ARG_OPERATORS)[number]
          )
        ) {
          const value = nestedArgs[0];
          let processedValue = value;
          if (isRelative && typeof value === "number") {
            processedValue = convertRelativeTime(value);
          }
          return { [fullOperator]: processedValue };
        } else if (
          MULTI_ARG_OPERATORS.includes(
            fullOperator as (typeof MULTI_ARG_OPERATORS)[number]
          )
        ) {
          return { [fullOperator]: nestedArgs };
        } else {
          return { [fullOperator]: nestedArgs };
        }
      } else {
        const parsed = parseValue(trimmed);
        if (isRelative && typeof parsed === "number") {
          return convertRelativeTime(parsed);
        }
        return parsed;
      }
    });
  }

  const trimmed = argsStr.replace(/^["']|["']$/g, "");

  const operatorMatch = trimmed.match(/^\$(\w+)\((.+)\)$/);
  if (operatorMatch) {
    const [, operatorName, nestedArgsStr] = operatorMatch;
    const fullOperator = `$${operatorName}`;

    const nestedArgs = parseTimeOperatorArgs(nestedArgsStr, isRelative);

    if (
      SINGLE_ARG_OPERATORS.includes(
        fullOperator as (typeof SINGLE_ARG_OPERATORS)[number]
      )
    ) {
      const value = nestedArgs[0];
      let processedValue = value;
      if (isRelative && typeof value === "number") {
        processedValue = convertRelativeTime(value);
      }
      return [{ [fullOperator]: processedValue }];
    } else if (
      MULTI_ARG_OPERATORS.includes(
        fullOperator as (typeof MULTI_ARG_OPERATORS)[number]
      )
    ) {
      return [{ [fullOperator]: nestedArgs }];
    } else {
      return [{ [fullOperator]: nestedArgs }];
    }
  } else {
    const parsed = parseValue(trimmed);
    if (isRelative && typeof parsed === "number") {
      return [convertRelativeTime(parsed)];
    }
    return [parsed];
  }
}

export function createOperatorQuery(
  operator: string,
  args: unknown[],
  fieldName: string
): Record<string, unknown> | null {
  if (
    DOCUMENT_LEVEL_OPERATORS.includes(
      operator as (typeof DOCUMENT_LEVEL_OPERATORS)[number]
    )
  ) {
    if (fieldName === "startTime" || fieldName === "endTime") {
      const conditions = args.map((arg) => {
        if (typeof arg === "object" && arg !== null) {
          return { [fieldName]: arg };
        } else {
          return { [fieldName]: { $eq: arg } };
        }
      });

      return { [operator]: conditions };
    } else {
      return { [operator]: args };
    }
  }

  if (
    SINGLE_ARG_OPERATORS.includes(
      operator as (typeof SINGLE_ARG_OPERATORS)[number]
    )
  ) {
    const value = args[0];

    let processedValue = value;
    if (
      (fieldName === "startTime" || fieldName === "endTime") &&
      typeof value === "number"
    ) {
      processedValue = convertRelativeTime(value);
    }

    return {
      [fieldName]: {
        [operator]: processedValue,
      },
    };
  }

  if (
    MULTI_ARG_OPERATORS.includes(
      operator as (typeof MULTI_ARG_OPERATORS)[number]
    )
  ) {
    return {
      [fieldName]: {
        [operator]: args,
      },
    };
  }

  return null;
}

export function extractOperators(text: string): ParsedOperator[] {
  const operators: ParsedOperator[] = [];

  const fieldOutsidePattern = /(-\w+)\s+\$(\w+)\(/g;
  let fieldMatch;

  while ((fieldMatch = fieldOutsidePattern.exec(text)) !== null) {
    const [fullMatch, flag, operatorName] = fieldMatch;
    const fullOperatorName = `$${operatorName}`;

    const startIndex = fieldMatch.index + fullMatch.length - 1;

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

  const sequentialPattern = /(?:^|\s)\$(\w+)\(/g;
  let sequentialMatch: RegExpExecArray | null;

  while ((sequentialMatch = sequentialPattern.exec(text)) !== null) {
    const [fullMatch, operatorName] = sequentialMatch;
    const fullOperatorName = `$${operatorName}`;

    const matchStart = sequentialMatch.index;
    let isNested = false;

    let parenCount = 0;
    for (let i = 0; i < matchStart; i++) {
      if (text[i] === "(") parenCount++;
      else if (text[i] === ")") parenCount--;
    }

    if (parenCount > 0) {
      isNested = true;
    }

    if (isNested) continue;

    const startIndex = sequentialMatch.index + fullMatch.length - 1;

    const argsStr = extractBalancedParens(text, startIndex);
    if (argsStr === null) continue;

    if (
      Object.values(OPERATORS).includes(
        fullOperatorName as (typeof OPERATORS)[keyof typeof OPERATORS]
      )
    ) {
      const getSequenceFields = [
        "-t",
        "-d",
        "-s",
        "-e",
        "-type",
        "-repeat",
        "-color",
        "-r",
        "-c",
      ];

      const existingSequentialOperators = operators.filter((op) =>
        getSequenceFields.includes(op.args[0] as string)
      );

      const fieldIndex = existingSequentialOperators.length;
      const assignedField =
        fieldIndex < getSequenceFields.length
          ? getSequenceFields[fieldIndex]
          : "-t";

      const args = parseEnhancedOperatorArgs(argsStr, assignedField);
      operators.push({
        operator: fullOperatorName,
        args,
      });
    }
  }

  return operators;
}

function parseEnhancedOperatorArgs(argsStr: string, field: string): unknown[] {
  if (!argsStr.trim()) {
    return [field, ""];
  }

  if (field && (argsStr.includes("$") || argsStr.includes(","))) {
    const nestedOperatorPattern = /\$(\w+)\(([^)]*)\)/g;
    const nestedMatches = Array.from(argsStr.matchAll(nestedOperatorPattern));

    if (nestedMatches.length > 0) {
      const parsedArgs = nestedMatches.map((match) => {
        const [, operatorName, valueStr] = match;
        const value = parseValue(valueStr.replace(/^["']|["']$/g, ""));
        return { [`$${operatorName}`]: value };
      });
      return [field, parsedArgs];
    }

    if (argsStr.includes(",")) {
      const values = argsStr
        .split(",")
        .map((arg) => parseValue(arg.trim().replace(/^["']|["']$/g, "")));
      return [field, values];
    }
  }

  const value = parseValue(argsStr.replace(/^["']|["']$/g, ""));
  return [field, value];
}

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
        return text.slice(openParenIndex + 1, i);
      }
    }
    i++;
  }

  return null;
}
