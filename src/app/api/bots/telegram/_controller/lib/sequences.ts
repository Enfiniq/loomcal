import { parseValue } from "@/app/api/bots/telegram/_controller/lib/parsers";

export function parseSequentialValues(content: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";
  let parenLevel = 0;
  let braceLevel = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char; // Include the opening quote
    } else if (inQuotes && char === quoteChar && content[i - 1] !== "\\") {
      inQuotes = false;
      current += char; // Include the closing quote
      quoteChar = "";
    } else if (!inQuotes && char === "(") {
      parenLevel++;
      current += char;
    } else if (!inQuotes && char === ")") {
      parenLevel--;
      current += char;
    } else if (!inQuotes && char === "{") {
      braceLevel++;
      current += char;
    } else if (!inQuotes && char === "}") {
      braceLevel--;
      current += char;

      if (braceLevel === 0 && current.trim()) {
        values.push(current.trim());
        current = "";
        while (i + 1 < content.length && /\s/.test(content[i + 1])) {
          i++;
        }
      }
    } else if (
      !inQuotes &&
      parenLevel === 0 &&
      braceLevel === 0 &&
      char === " "
    ) {
      if (current.trim()) {
        values.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    values.push(current.trim());
  }

  return values.map((value) => {
    return value.replace(/\\"/g, '"').replace(/\\'/g, "'");
  });
}

export function extractSequence(text: string): string[] {
  const commandPattern = /^\/\w+\s*/;
  let cleanText = text.replace(commandPattern, "");

  cleanText = removeFlagsFromText(cleanText);

  if (!cleanText) return [];

  const args = parseSequentialArguments(cleanText);

  return removeOptionsAndFilterFromSequence(args);
}

export function extractSequenceWithOptions(text: string): string[] {
  const commandPattern = /^\/\w+\s*/;
  let cleanText = text.replace(commandPattern, "");

  cleanText = removeFlagsFromText(cleanText);

  if (!cleanText) return [];

  return parseSequentialArguments(cleanText);
}

function removeFlagsFromText(text: string): string {
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

  for (let i = flagMatches.length - 1; i >= 0; i--) {
    const flagMatch = flagMatches[i];
    text =
      text.slice(0, flagMatch.startPos) + text.slice(flagMatch.valueEndPos);
  }

  return text.trim();
}

function parseSequentialArguments(cleanText: string): string[] {
  const args: string[] = [];
  let i = 0;

  while (i < cleanText.length) {
    // Skip whitespace
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

function removeOptionsAndFilterFromSequence(args: string[]): string[] {
  const result = [...args];

  if (result.length > 0) {
    const lastArg = result[result.length - 1];
    if (lastArg.startsWith("{") && lastArg.endsWith("}")) {
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
            result.pop();
          }
        }
      } catch {
        // Not a valid options object, keep it in sequence
      }
    }
  }

  if (result.length > 0) {
    const lastArg = result[result.length - 1];
    if (lastArg.startsWith("{") && lastArg.endsWith("}")) {
      try {
        const parsed = parseValue(lastArg);
        if (typeof parsed === "object" && parsed !== null) {
          result.pop();
        }
      } catch {
        // Not a valid filter object, keep it in sequence
      }
    }
  }

  return result;
}
