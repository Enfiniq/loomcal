export function parseValue(value: string): unknown {
  if (!value || value === "null") return null;
  if (value === "undefined") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;

  if (/^!\d+\.?\d*$/.test(value)) {
    const num = parseFloat(value.slice(1));
    return isNaN(num) ? value : -num;
  }

  if (/^-?\d+\.?\d*$/.test(value)) {
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    try {
      const content = value.slice(1, -1);
      if (!content.trim()) return [];
      return content.split(",").map((v) => parseValue(v.trim()));
    } catch {
      return value;
    }
  }

  if (value.startsWith("{") && value.endsWith("}")) {
    try {
      return JSON.parse(value);
    } catch {
      try {
        const fixedValue = value.replace(
          /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
          '$1"$2":'
        );
        return JSON.parse(fixedValue);
      } catch {
        return value;
      }
    }
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function parseCriticalObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    try {
      const fixedContent = content.replace(
        /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
        '$1"$2":'
      );
      return JSON.parse(fixedContent);
    } catch {
      return parseValue(content);
    }
  }
}
