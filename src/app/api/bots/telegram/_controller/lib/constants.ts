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
  SETUP_COMPLETE: "Bot configuration completed successfully\\!",
  EVENT_CREATED: "Event created successfully\\!",
  EVENTS_RETRIEVED: "Events retrieved successfully\\!",
  EVENTS_UPDATED: "Events updated successfully\\!",
  EVENTS_DELETED: "Events deleted successfully\\!",
} as const;

export const HELP_MESSAGES = {
  SETUP: `Setup Command

Configure the bot with your LoomCal API key\\.

Format:
\`/setup \\[api\\_key\\] \\[base\\_url\\] \\[timeout\\] \\[retries\\]\`

Using flags:
\`/setup \\-api \\[key\\] \\-base \\[url\\] \\-timeout \\[ms\\] \\-retries \\[count\\]\`

Parameters:
• api\\_key \\(required\\) \\- Your LoomCal API key
• base\\_url \\(optional\\) \\- Custom API endpoint  
• timeout \\(optional\\) \\- Request timeout in milliseconds
• retries \\(optional\\) \\- Number of retry attempts`,

  CREATE: `Create Command

Create new events in your calendar\\.

Format:
\`/create \\[title\\] \\[description\\] \\[startTime\\] \\[endTime\\] \\[type\\] \\[repeat\\] \\[color\\] \\[resource\\] \\[customData\\] \\[options\\]\`

Using flags:
\`/create \\-t \\[title\\] \\-d \\[description\\] \\-rt \\[startTime\\] \\[endTime\\] \\-type \\[type\\] \\-repeat \\[count\\] \\-color \\[color\\] \\-r \\[resource\\] \\-c \\[custom\\_data\\] \\-o \\[options\\]\`

Options schema:
\`\`\`json
{
  "isSigned": "boolean | object",
  "savingRule": {
    "timeBetweenDuplicates": "number",
    "onDuplicate": "update|ignore|reject",
    "uniquenessFields": ["field1"]
  }
}
\`\`\``,

  GET: `Get Command

Retrieve events with optional filtering\\.

Format:
\`/get \\[title\\] \\[description\\] \\[startTime\\] \\[endTime\\] \\[type\\] \\[repeat\\] \\[color\\] \\[resource\\] \\[customData\\] \\[options\\] \\[filter\\]\`

Using flags:
\`/get \\-t \\[title\\] \\-d \\[description\\] \\-rt \\[startTime\\] \\[endTime\\] \\-type \\[type\\] \\-repeat \\[count\\] \\-color \\[color\\] \\-r \\[resource\\] \\-c \\[custom\\_data\\] \\-o \\[options\\] \\-f \\[filter\\]\`

Filter schema:
\`\`\`json
{
  "field": "value", 
  "field2": {
    "$operator": "value"
  }, 
  "$and": [
    {
      "field": "value"
    }
  ]
}
\`\`\`

Options schema:
\`\`\`json
{
  "limit": "number", 
  "sortBy": "string", 
  "sortOrder": "asc|desc", 
  "offset": "number", 
  "isSigned": "boolean"
}
\`\`\``,

  UPDATE: `Update Command

Update existing events using target criteria and new values\\.

Format:
\`/update \\[title\\] \\[description\\] \\[startTime\\] \\[endTime\\] \\[type\\] \\[repeat\\] \\[color\\] \\[resource\\] \\[customData\\] \\[options\\] \\[filter\\] \\-to \\[new\\_values\\]\`

Using flags:
\`/update \\-t \\[title\\] \\-d \\[description\\] \\-rt \\[startTime\\] \\[endTime\\] \\-type \\[type\\] \\-repeat \\[count\\] \\-color \\[color\\] \\-r \\[resource\\] \\-c \\[custom\\_data\\] \\-o \\[options\\] \\-f \\[filter\\] \\-to \\[new\\_values\\]\`

Options schema:
\`\`\`json
{
  "limit": "number",
  "sortBy": "string", 
  "sortOrder": "asc|desc",
  "offset": "number",
  "isSigned": "boolean"
}
\`\`\``,

  DELETE: `Delete Command

Delete events matching specified criteria\\.

Format:
\`/delete \\[title\\] \\[description\\] \\[startTime\\] \\[endTime\\] \\[type\\] \\[repeat\\] \\[color\\] \\[resource\\] \\[customData\\] \\[options\\] \\[filter\\]\`

Using flags:
\`/delete \\-t \\[title\\] \\-d \\[description\\] \\-rt \\[startTime\\] \\[endTime\\] \\-type \\[type\\] \\-repeat \\[count\\] \\-color \\[color\\] \\-r \\[resource\\] \\-c \\[custom\\_data\\] \\-o \\[options\\] \\-f \\[filter\\]\`

⚠️ Warning: This action cannot be undone\\!

Options schema:
\`\`\`json
{
  "limit": "number",
  "sortBy": "string",
  "sortOrder": "asc|desc",
  "offset": "number",
  "isSigned": "boolean"
}
\`\`\``,

  JSON_TIPS: `JSON Format

Valid structure:
\`\`\`json
{
  "key": "value",
  "number": 123,
  "boolean": true
}
\`\`\`

Rules:
• Keys must be quoted with double quotes
• Values use double quotes for strings
• No trailing commas
• Escape special characters in values

\\#\\#\\# Complex structure:
\`\`\`json
\\{"customData": \\{"priority": "high"\\}, "\\$or": \\[\\{"type": "meeting"\\}\\]\\}
\`\`\``,

  FLAG: `Available Flags

• \`\\-t\` \\- Title
• \`\\-d\` \\- Description
• \`\\-rt\` \\- Relative time \\(Minutes from now\\)
• \`\\-at\` \\- Absolute time
• \`\\-type\` \\- Event type
• \`\\-color\` \\- Color
• \`\\-r\` \\- Resource URL
• \`\\-c\` \\- Custom data \\(JSON object\\)
• \`\\-repeat\` \\- Repeat count
• \`\\-f\` \\- Filter \\(JS object\\)
• \`\\-o\` \\- Options \\(JS object\\)

Time flags:
• \`\\-rt \\[startTime\\] \\[endTime\\]\` \\- Relative time \\(Minutes from now\\)
• \`\\-at \\[startTime\\] \\[endTime\\]\` \\- Absolute time
• \`\\-rt \\-s \\[minutes\\]\` \\- Relative start time \\(minutes from now\\)
• \`\\-rt \\-e \\[minutes\\]\` \\- Relative end time \\(minutes from now\\)
• \`\\-at \\-s "ISO\\_DATE"\` \\- Absolute start time
• \`\\-at \\-e "ISO\\_DATE"\` \\- Absolute end time
`,

  OPERATOR: `Available Operators

• \`\\$eq\\(value\\)\` \\- Equals
• \`\\$ne\\(value\\)\` \\- Not equals
• \`\\$gt\\(value\\)\` \\- Greater than
• \`\\$lt\\(value\\)\` \\- Less than
• \`\\$gte\\(value\\)\` \\- Greater than or equal
• \`\\$lte\\(value\\)\` \\- Less than or equal
• \`\\$in\\(val1,val2\\)\` \\- Value in array
• \`\\$nin\\(val1,val2\\)\` \\- Value not in array
• \`\\$regex\\("pattern"\\)\` \\- Regular expression
• \`\\$exists\\(true/false\\)\` \\- Field exists
• \`\\$and\\(cond1,cond2, \\.\\.\\.\\)\` \\- Logical AND
• \`\\$or\\(cond1,cond2, \\.\\.\\.\\)\` \\- Logical OR
• \`\\$not\\(cond1, cond2, \\.\\.\\.\\)\` \\- Logical NOT`,
} as const;
