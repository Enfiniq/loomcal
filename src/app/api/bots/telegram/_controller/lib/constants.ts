export const COMMANDS = {
  SETUP: "/setup",
  CREATE: "/create",
  GET: "/get",
  UPDATE: "/update",
  DELETE: "/delete",
} as const;

export const FLAGS = {
  API: "-api",
  BASE: "-base",
  TIMEOUT: "-timeout",
  RETRIES: "-retries",
  TITLE: "-t",
  DESCRIPTION: "-d",
  RELATIVE_TIME: "-rt",
  ABSOLUTE_TIME: "-at",
  START: "-s",
  END: "-e",
  TYPE: "-type",
  REPEAT: "-repeat",
  COLOR: "-color",
  RESOURCE: "-r",
  CUSTOM: "-c",
  OPTIONS: "-o",
  FILTER: "-f",
  TO: "-to",
} as const;

export const OPERATORS = {
  AND: "$and",
  OR: "$or",
  NOT: "$not",
  GT: "$gt",
  LT: "$lt",
  GTE: "$gte",
  LTE: "$lte",
  EQ: "$eq",
  NE: "$ne",
  IN: "$in",
  NIN: "$nin",
  REGEX: "$regex",
  EXISTS: "$exists",
} as const;

export const SINGLE_ARG_OPERATORS = [
  "$regex",
  "$exists",
  "$eq",
  "$ne",
  "$gt",
  "$lt",
  "$gte",
  "$lte",
  "$not",
] as const;

export const MULTI_ARG_OPERATORS = ["$in", "$nin"] as const;

export const DOCUMENT_LEVEL_OPERATORS = ["$and", "$or", "$not"] as const;

export const SEQUENCES = {
  SETUP: ["apiKey", "baseUrl", "timeout", "retries"],
  CREATE: [
    "title",
    "description",
    "startTime",
    "endTime",
    "type",
    "repeat",
    "color",
    "resource",
    "customData",
    "options",
  ],
  GET: [
    "title",
    "description",
    "startTime",
    "endTime",
    "type",
    "repeat",
    "color",
    "resource",
    "customData",
    "options",
    "filter",
  ],
  UPDATE: ["target", "updates", "options", "filter"],
  DELETE: ["target", "options", "filter"],
} as const;

export const ERROR_MESSAGES = {
  NO_CONFIG:
    "⚠️ Please setup the bot first using `\\/setup` command\\.\n\nExample: `\\/setup lc\\_your\\_api\\_key`",
  INVALID_API_KEY:
    'Invalid API key format\\. API key must start with "lc\\_"\\.\n\nExample: `lc\\_abc123def456`',
  MISSING_REQUIRED: "Missing required parameters",
  INVALID_COMMAND: "Invalid command format",
  PARSING_ERROR: "Error parsing command parameters",
  API_ERROR:
    "Error communicating with LoomCal API\\. Please check your configuration\\.",
  INVALID_JSON: "Invalid JSON format\\. Please check your syntax\\.",
  MISSING_TO_FLAG:
    "Update command requires `\\-to` flag to specify what to update",
  EMPTY_FILTER: "Filter object cannot be empty",
  INVALID_OPERATOR: "Invalid operator used",
} as const;

export const SUCCESS_MESSAGES = {
  SETUP_COMPLETE: "Bot configuration completed successfully!",
  EVENT_CREATED: "Event created successfully!",
  EVENTS_RETRIEVED: "Events retrieved successfully!",
  EVENTS_UPDATED: "Events updated successfully!",
  EVENTS_DELETED: "Events deleted successfully!",
} as const;

import { bold, inlineCode, codeBlock } from "./formatting";

export const HELP_MESSAGES = {
  SETUP: () => `${bold("Setup Command")}

Configure the bot with your LoomCal API key.

${bold("Format:")}
${inlineCode("/setup [api_key] [base_url] [timeout] [retries]")}

${bold("Using flags:")}
${inlineCode("/setup -api [key] -base [url] -timeout [ms] -retries [count]")}

${bold("Parameters:")}
• ${bold("api_key")} (required) - Your LoomCal API key
• ${bold("base_url")} (optional) - Custom API endpoint  
• ${bold("timeout")} (optional) - Request timeout in milliseconds
• ${bold("retries")} (optional) - Number of retry attempts`,

  CREATE: () => `${bold("Create Command")}

Create new events in your calendar.

${bold("Format:")}
${inlineCode(
  "/create [title] [description] [startTime] [endTime] [type] [repeat] [color] [resource] [customData] [options]"
)}

${bold("Using flags:")}
${inlineCode(
  "/create -t [title] -d [description] -rt [startTime] [endTime] -type [type] -repeat [count] -color [color] -r [resource] -c [custom_data] -o [options]"
)}

${bold("Options schema:")}
${codeBlock(
  `{
  "isSigned": "boolean | object",
  "savingRule": {
    "timeBetweenDuplicates": "number",
    "onDuplicate": "update|ignore|reject",
    "uniquenessFields": ["field1"]
  }
}`,
  "json"
)}`,

  GET: () => `${bold("Get Command")}

Retrieve events with optional filtering.

${bold("Format:")}
${inlineCode(
  "/get [title] [description] [startTime] [endTime] [type] [repeat] [color] [resource] [customData] [options] [filter]"
)}

${bold("Using flags:")}
${inlineCode(
  "/get -t [title] -d [description] -rt [startTime] [endTime] -type [type] -repeat [count] -color [color] -r [resource] -c [custom_data] -o [options] -f [filter]"
)}

${bold("Filter schema:")}
${codeBlock(
  `{
  "field": "value", 
  "field2": {
    "$operator": "value"
  }, 
  "$and": [
    {
      "field": "value"
    }
  ]
}`,
  "json"
)}

${bold("Options schema:")}
${codeBlock(
  `{
  "limit": "number", 
  "sortBy": "string", 
  "sortOrder": "asc|desc", 
  "offset": "number", 
  "isSigned": "boolean"
}`,
  "json"
)}`,

  UPDATE: () => `${bold("Update Command")}

Update existing events using target criteria and new values.

${bold("Format:")}
${inlineCode(
  "/update [title] [description] [startTime] [endTime] [type] [repeat] [color] [resource] [customData] [options] [filter] -to [new_values]"
)}

${bold("Using flags:")}
${inlineCode(
  "/update -t [title] -d [description] -rt [startTime] [endTime] -type [type] -repeat [count] -color [color] -r [resource] -c [custom_data] -o [options] -f [filter] -to [new_values]"
)}

${bold("Options schema:")}
${codeBlock(
  `{
  "limit": "number",
  "sortBy": "string", 
  "sortOrder": "asc|desc",
  "offset": "number",
  "isSigned": "boolean"
}`,
  "json"
)}`,

  DELETE: () => `${bold("Delete Command")}

Delete events matching specified criteria.

${bold("Format:")}
${inlineCode(
  "/delete [title] [description] [startTime] [endTime] [type] [repeat] [color] [resource] [customData] [options] [filter]"
)}

${bold("Using flags:")}
${inlineCode(
  "/delete -t [title] -d [description] -rt [startTime] [endTime] -type [type] -repeat [count] -color [color] -r [resource] -c [custom_data] -o [options] -f [filter]"
)}

${bold("⚠️ Warning:")} This action cannot be undone!

${bold("Options schema:")}
${codeBlock(
  `{
  "limit": "number",
  "sortBy": "string",
  "sortOrder": "asc|desc",
  "offset": "number",
  "isSigned": "boolean"
}`,
  "json"
)}`,

  JSON_TIPS: () => `${bold("JSON Format")}

${bold("Valid structure:")}
${codeBlock(
  `{
  "key": "value",
  "number": 123,
  "boolean": true
}`,
  "json"
)}

${bold("Rules:")}
• Keys must be quoted with double quotes
• Values use double quotes for strings
• No trailing commas
• Escape special characters in values

${bold("Complex structure:")}
${codeBlock(
  `{"customData": {"priority": "high"}, "$or": [{"type": "meeting"}]}`,
  "json"
)}`,

  FLAG: () => `${bold("Available Flags")}

• ${inlineCode("-t")} - Title
• ${inlineCode("-d")} - Description
• ${inlineCode("-rt")} - Relative time (Minutes from now)
• ${inlineCode("-at")} - Absolute time
• ${inlineCode("-type")} - Event type
• ${inlineCode("-color")} - Color
• ${inlineCode("-r")} - Resource URL
• ${inlineCode("-c")} - Custom data (JSON object)
• ${inlineCode("-repeat")} - Repeat count
• ${inlineCode("-f")} - Filter (JS object)
• ${inlineCode("-o")} - Options (JS object)

${bold("Time flags:")}
• ${inlineCode("-rt [startTime] [endTime]")} - Relative time (Minutes from now)
• ${inlineCode("-at [startTime] [endTime]")} - Absolute time
• ${inlineCode("-rt -s [minutes]")} - Relative start time (minutes from now)
• ${inlineCode("-rt -e [minutes]")} - Relative end time (minutes from now)
• ${inlineCode('-at -s "ISO_DATE"')} - Absolute start time
• ${inlineCode('-at -e "ISO_DATE"')} - Absolute end time`,

  OPERATOR: () => `${bold("Available Operators")}

• ${inlineCode("$eq(value)")} - Equals
• ${inlineCode("$ne(value)")} - Not equals
• ${inlineCode("$gt(value)")} - Greater than
• ${inlineCode("$lt(value)")} - Less than
• ${inlineCode("$gte(value)")} - Greater than or equal
• ${inlineCode("$lte(value)")} - Less than or equal
• ${inlineCode("$in(val1,val2)")} - Value in array
• ${inlineCode("$nin(val1,val2)")} - Value not in array
• ${inlineCode('$regex("pattern")')} - Regular expression
• ${inlineCode("$exists(true/false)")} - Field exists
• ${inlineCode("$and(cond1,cond2, ...)")} - Logical AND
• ${inlineCode("$or(cond1,cond2, ...)")} - Logical OR
• ${inlineCode("$not(cond1, cond2, ...)")} - Logical NOT`,
} as const;
