import { ParsedFlags } from "@/app/api/bots/telegram/_controller/lib/types";
import { parseValue, parseCriticalObject } from "@/app/api/bots/telegram/_controller/lib/parsers";
import { parseTopLevelOperators } from "@/app/api/bots/telegram/_controller/lib/operators";
import { parseSequentialValues } from "@/app/api/bots/telegram/_controller/lib/sequences";
import { processTimeValue } from "@/app/api/bots/telegram/_controller/lib/utils";

export function splitByFlags(text: string): Array<{
  type: "sequential" | "flag";
  content: string;
  flag?: string;
}> {
  const segments: Array<{
    type: "sequential" | "flag";
    content: string;
    flag?: string;
  }> = [];

  const flagMatches: Array<{
    flag: string;
    subFlag?: string;
    start: number;
    end: number;
  }> = [];

  let i = 0;
  while (i < text.length) {
    const char = text[i];

    if (char === '"' || char === "'") {
      const quoteChar = char;
      i++;

      while (i < text.length) {
        if (text[i] === quoteChar && text[i - 1] !== "\\") {
          break;
        }
        i++;
      }
      i++;
      continue;
    }

    if (char === "{") {
      let braceLevel = 1;
      i++;

      while (i < text.length && braceLevel > 0) {
        const currentChar = text[i];

        if (currentChar === '"' || currentChar === "'") {
          const quoteChar = currentChar;
          i++;

          while (i < text.length) {
            if (text[i] === quoteChar && text[i - 1] !== "\\") {
              break;
            }
            i++;
          }
          i++;
          continue;
        }

        if (currentChar === "{") {
          braceLevel++;
        } else if (currentChar === "}") {
          braceLevel--;
        }

        i++;
      }
      continue;
    }

    if (char === "-" && /\w/.test(text[i + 1] || "")) {
      const beforeChar = text[i - 1];
      const isNegativeNumber =
        beforeChar &&
        /[\s:=,\[]/.test(beforeChar) &&
        /\d/.test(text[i + 1] || "");

      if (!isNegativeNumber) {
        const flagStart = i;
        i++;

        while (i < text.length && /\w/.test(text[i])) {
          i++;
        }

        const flag = text.slice(flagStart, i);
        let flagEnd = i;
        let subFlag: string | undefined;

        if (i < text.length && /\s/.test(text[i])) {
          while (i < text.length && /\s/.test(text[i])) {
            i++;
          }

          if (
            i < text.length - 1 &&
            text[i] === "-" &&
            /[se]/.test(text[i + 1])
          ) {
            const subFlagStart = i;
            i += 2;
            subFlag = text.slice(subFlagStart, i);
            flagEnd = i;
          }
        }

        flagMatches.push({
          flag,
          subFlag,
          start: flagStart,
          end: flagEnd,
        });

        continue;
      }
    }

    i++;
  }

  let currentPos = 0;

  for (let i = 0; i < flagMatches.length; i++) {
    const currentFlag = flagMatches[i];
    const nextFlag = flagMatches[i + 1];

    if (currentPos < currentFlag.start) {
      const sequentialContent = text
        .slice(currentPos, currentFlag.start)
        .trim();
      if (sequentialContent) {
        segments.push({
          type: "sequential",
          content: sequentialContent,
        });
      }
    }

    const flagEnd = nextFlag ? nextFlag.start : text.length;
    const flagContent = text.slice(currentFlag.end, flagEnd).trim();

    segments.push({
      type: "flag",
      content: flagContent,
      flag: currentFlag.subFlag || currentFlag.flag,
    });

    currentPos = flagEnd;
  }

  if (currentPos < text.length) {
    const remainingContent = text.slice(currentPos).trim();
    if (remainingContent) {
      segments.push({
        type: "sequential",
        content: remainingContent,
      });
    }
  }

  return segments;
}

export function parseTimeFlags(
  content: string,
  isRelative: boolean
): { query?: Record<string, unknown>; startTime?: string; endTime?: string } {
  const result: {
    query?: Record<string, unknown>;
    startTime?: string;
    endTime?: string;
  } = {};

  const startMatch = content.match(/-s\s+([^\s-]+(?:\([^)]*\))?)/);
  const endMatch = content.match(/-e\s+([^\s-]+(?:\([^)]*\))?)/);

  if (startMatch) {
    const startValue = startMatch[1];
    const processedStart = processTimeValue(
      startValue,
      "startTime",
      isRelative
    );
    if (processedStart !== null) {
      if (
        typeof processedStart === "object" &&
        processedStart !== null &&
        "operator" in processedStart &&
        processedStart.operator
      ) {
        const operatorResult = processedStart as {
          operator: true;
          query: Record<string, unknown>;
        };
        result.query = { ...result.query, ...operatorResult.query };
      } else {
        result.startTime = processedStart as string;
      }
    }
  }

  if (endMatch) {
    const endValue = endMatch[1];
    const processedEnd = processTimeValue(endValue, "endTime", isRelative);
    if (processedEnd !== null) {
      if (
        typeof processedEnd === "object" &&
        processedEnd !== null &&
        "operator" in processedEnd &&
        processedEnd.operator
      ) {
        const operatorResult = processedEnd as {
          operator: true;
          query: Record<string, unknown>;
        };
        result.query = { ...result.query, ...operatorResult.query };
      } else {
        result.endTime = processedEnd as string;
      }
    }
  }

  // If no sub-flags, handle the content
  if (!startMatch && !endMatch) {
    const topLevelOperators = parseTopLevelOperators(content);

    if (topLevelOperators.length > 0) {
      for (let i = 0; i < topLevelOperators.length; i++) {
        const operatorStr = topLevelOperators[i];
        const fieldName = i === 0 ? "startTime" : "endTime";

        const processedOperator = processTimeValue(
          operatorStr,
          fieldName,
          isRelative
        );
        if (processedOperator !== null) {
          if (
            typeof processedOperator === "object" &&
            processedOperator !== null &&
            "operator" in processedOperator &&
            processedOperator.operator
          ) {
            const operatorResult = processedOperator as {
              operator: true;
              query: Record<string, unknown>;
            };
            result.query = { ...result.query, ...operatorResult.query };
          }
        }
      }
    } else {
      const values = parseSequentialValues(content);
      if (values.length >= 1) {
        const processedStart = processTimeValue(
          values[0],
          "startTime",
          isRelative
        );
        if (processedStart !== null) {
          if (
            typeof processedStart === "object" &&
            processedStart !== null &&
            "operator" in processedStart &&
            processedStart.operator
          ) {
            const operatorResult = processedStart as {
              operator: true;
              query: Record<string, unknown>;
            };
            result.query = { ...result.query, ...operatorResult.query };
          } else {
            result.startTime = processedStart as string;
          }
        }
      }
      if (values.length >= 2) {
        const processedEnd = processTimeValue(values[1], "endTime", isRelative);
        if (processedEnd !== null) {
          if (
            typeof processedEnd === "object" &&
            processedEnd !== null &&
            "operator" in processedEnd &&
            processedEnd.operator
          ) {
            const operatorResult = processedEnd as {
              operator: true;
              query: Record<string, unknown>;
            };
            result.query = { ...result.query, ...operatorResult.query };
          } else {
            result.endTime = processedEnd as string;
          }
        }
      }
    }
  }

  return result;
}

export function extractFlags(text: string): ParsedFlags {
  const flags: ParsedFlags = {};

  const flagMatches: Array<{
    flag: string;
    subFlag?: string;
    startPos: number;
    valueStartPos: number;
    valueEndPos: number;
  }> = [];

  const flagPattern = /(-\w+)(?:\s+(-\w+))?/g;
  let match;

  while ((match = flagPattern.exec(text)) !== null) {
    const [fullMatch, mainFlag, subFlag] = match;
    const startPos = match.index;
    const valueStartPos = startPos + fullMatch.length;

    let insideJSON = false;
    let braceLevel = 0;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < startPos; i++) {
      const char = text[i];

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && text[i - 1] !== "\\") {
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
    }

    if (braceLevel > 0) {
      insideJSON = true;
    }

    if (insideJSON) {
      continue;
    }

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

    currentFlag.valueEndPos = nextFlag ? nextFlag.startPos : text.length;
  }

  // Extract values for each flag
  for (let i = 0; i < flagMatches.length; i++) {
    const currentFlag = flagMatches[i];

    const valueText = text
      .slice(currentFlag.valueStartPos, currentFlag.valueEndPos)
      .trim();

    let cleanValue: string;

    if (valueText.startsWith("{")) {
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
      const quote = valueText[0];
      const endQuoteIndex = valueText.indexOf(quote, 1);
      if (endQuoteIndex !== -1) {
        cleanValue = valueText.slice(1, endQuoteIndex);
      } else {
        cleanValue = valueText.slice(1);
      }
    } else {
      cleanValue = valueText.split(/\s+-\w+/)[0].trim();
    }

    if (currentFlag.subFlag) {
      if (!flags[currentFlag.flag]) flags[currentFlag.flag] = {};
      (flags[currentFlag.flag] as Record<string, unknown>)[
        currentFlag.subFlag
      ] = parseValue(cleanValue);
    } else {
      const parsedValue = parseValue(cleanValue);

      if (
        currentFlag.flag === "-c" ||
        currentFlag.flag === "-o" ||
        currentFlag.flag === "-f"
      ) {
        if (
          typeof parsedValue === "string" &&
          parsedValue.startsWith("{") &&
          parsedValue.endsWith("}")
        ) {
          try {
            flags[currentFlag.flag] = parseCriticalObject(parsedValue) as
              | string
              | number
              | boolean
              | Record<string, unknown>;
          } catch {
            flags[currentFlag.flag] = parsedValue as
              | string
              | number
              | boolean
              | Record<string, unknown>;
          }
        } else {
          flags[currentFlag.flag] = parsedValue as
            | string
            | number
            | boolean
            | Record<string, unknown>;
        }
      } else {
        flags[currentFlag.flag] = parsedValue as
          | string
          | number
          | boolean
          | Record<string, unknown>;
      }
    }
  }

  return flags;
}

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

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && text[i - 1] !== "\\") {
      inString = false;
      stringChar = "";
    }

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

  return null;
}
