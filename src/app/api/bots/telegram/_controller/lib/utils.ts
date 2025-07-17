import { convertRelativeTime } from "@/app/api/bots/telegram/_controller/lib/helpers";
import { parseValue } from "@/app/api/bots/telegram/_controller/lib/parsers";
import { FLAGS } from "@/app/api/bots/telegram/_controller/lib/constants";
import {
  parseTimeOperatorArgs,
  createOperatorQuery,
} from "@/app/api/bots/telegram/_controller/lib/operators";

export function separateCombinedJSONObjects(combinedString: string): string[] {
  const objects: string[] = [];
  const splitPattern = /}\s*{/g;
  let lastIndex = 0;
  let match;

  while ((match = splitPattern.exec(combinedString)) !== null) {
    const firstObject = combinedString.substring(lastIndex, match.index + 1);
    if (firstObject.trim()) {
      objects.push(firstObject.trim());
    }
    lastIndex = match.index + match[0].length - 1;
  }

  if (lastIndex < combinedString.length) {
    const lastObject = combinedString.substring(lastIndex);
    if (lastObject.trim()) {
      objects.push(lastObject.trim());
    }
  }

  if (objects.length === 0) {
    objects.push(combinedString);
  }

  return objects;
}

export function processTimeValue(
  value: string,
  fieldName: string,
  isRelative: boolean
): unknown | { operator: true; query: Record<string, unknown> } | null {
  const operatorMatch = value.match(/^\$(\w+)\((.+)\)$/);
  if (operatorMatch) {
    const [, operatorName, argsStr] = operatorMatch;
    const fullOperator = `$${operatorName}`;

    const args = parseTimeOperatorArgs(argsStr, isRelative);
    const operatorQuery = createOperatorQuery(fullOperator, args, fieldName);
    if (operatorQuery) {
      return {
        operator: true,
        query: operatorQuery,
      };
    }

    return null;
  }

  let parsedValue = parseValue(value);

  if (fieldName === "startTime" || fieldName === "endTime") {
    if (isRelative && typeof parsedValue === "number") {
      parsedValue = convertRelativeTime(parsedValue);
    } else if (!isRelative && typeof parsedValue === "number") {
      parsedValue = new Date(parsedValue * 1000).toISOString();
    }
  }

  return parsedValue;
}

export function mapFlagToFieldName(flag: string): string | null {
  const flagMap: Record<string, string> = {
    [FLAGS.TITLE]: "title",
    [FLAGS.DESCRIPTION]: "description",
    [FLAGS.TYPE]: "type",
    [FLAGS.REPEAT]: "repeat",
    [FLAGS.COLOR]: "color",
    [FLAGS.RESOURCE]: "resource",
    [FLAGS.CUSTOM]: "customData",
    [FLAGS.OPTIONS]: "options",
    [FLAGS.FILTER]: "filter",
    [FLAGS.START]: "startTime",
    [FLAGS.END]: "endTime",
  };

  return flagMap[flag] || null;
}
