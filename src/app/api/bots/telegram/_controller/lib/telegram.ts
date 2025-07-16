import { getAxiosInstance } from "./axios";
import { LoomCal } from "../../../../../../sdk/loomcal";
import {
  extractFlags,
  extractOperators,
  extractSequence,
  extractOptions,
  extractFilter,
  normalizeOptions,
  toCreateOptions,
  toOperationOptions,
  convertRelativeTime,
  validateApiKey,
  ParsedFlags,
  ParsedOptions,
} from "./helpers";
import {
  COMMANDS,
  FLAGS,
  OPERATORS,
  SINGLE_ARG_OPERATORS,
  MULTI_ARG_OPERATORS,
  DOCUMENT_LEVEL_OPERATORS,
  SEQUENCES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HELP_MESSAGES,
} from "./constants";

// Types for parsed command data
interface ParsedEventData {
  target: Record<string, unknown>;
  options: ParsedOptions;
}

interface ParsedUpdateData {
  target: Record<string, unknown>;
  updates: Record<string, unknown>;
  options: ParsedOptions;
}

interface ParsedDeleteData {
  target: Record<string, unknown>;
  options: ParsedOptions;
}

// Storage for user configurations (in production, use a database)
const userConfigs = new Map<
  number,
  {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  }
>();

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

/**
 * Send message to Telegram user
 */
export async function sendMessage(
  chatId: number,
  text: string,
  options?: { parse_mode?: string }
): Promise<void> {
  try {
    const telegramApi = getAxiosInstance();
    await telegramApi.post("sendMessage", {
      chat_id: chatId,
      text,
      ...options,
    });
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    throw error;
  }
}

/**
 * Handle start command
 */
async function handleStartCommand(chatId: number): Promise<void> {
  const startMessage =
    `Welcome to LoomCal Bot!\n\n` +
    `This bot helps you manage your calendar events through LoomCal API.\n\n` +
    `Available Commands:\n` +
    `• /setup [apiKey] - Configure your API key\n` +
    `• /create [event_data] - Create new events\n` +
    `• /get [filters] - Get existing events\n` +
    `• /update [target] [data] - Update events\n` +
    `• /delete [target] - Delete events\n` +
    `• /help - Show detailed help\n\n` +
    `To get started, configure your API key:\n` +
    `/setup YOUR_API_KEY\n\n` +
    `Need help? Type /help for detailed command information.`;

  await sendMessage(chatId, startMessage);
}

/**
 * Handle help command
 */
async function handleHelpCommand(chatId: number, text: string): Promise<void> {
  const parts = text.trim().split(/\s+/);
  const specificCommand = parts[1];

  if (specificCommand) {
    // Show help for specific command
    const command = specificCommand.toLowerCase();
    let helpMessage = "";

    switch (command) {
      case "setup":
        helpMessage = HELP_MESSAGES.SETUP;
        break;
      case "create":
        helpMessage = HELP_MESSAGES.CREATE;
        break;
      case "get":
        helpMessage = HELP_MESSAGES.GET;
        break;
      case "update":
        helpMessage = HELP_MESSAGES.UPDATE;
        break;
      case "delete":
        helpMessage = HELP_MESSAGES.DELETE;
        break;
      default:
        helpMessage =
          `Unknown command: ${specificCommand}\n\n` +
          `Available commands: setup, create, get, update, delete\n\n` +
          `Type /help to see all available commands.`;
    }

    await sendMessage(chatId, helpMessage);
  } else {
    // Show general help
    const generalHelp =
      `LoomCal Bot Help\n\n` +
      `Available Commands:\n` +
      `• /setup [apiKey] - Configure your API key\n` +
      `• /create [event_data] - Create new events\n` +
      `• /get [filters] - Get existing events\n` +
      `• /update [target] [data] - Update events\n` +
      `• /delete [target] - Delete events\n\n` +
      `Get Detailed Help:\n` +
      `Type /help [command] for specific examples:\n` +
      `• /help setup - Setup instructions\n` +
      `• /help create - Create event examples\n` +
      `• /help get - Query examples\n` +
      `• /help update - Update examples\n` +
      `• /help delete - Delete examples`;

    await sendMessage(chatId, generalHelp);
  }
}

/**
 * Get error-specific suggestion based on command text
 */
function getErrorSuggestion(text: string): string {
  const command = text.split(" ")[0]?.toLowerCase();

  switch (command) {
    case "/setup":
      return "Setup Help: Use /help setup for API key configuration instructions.";
    case "/create":
      return "Create Help: Use /help create for event creation format and fields.";
    case "/get":
      return "Get Help: Use /help get for query format and filter options.";
    case "/update":
      return "Update Help: Use /help update for update syntax and operators.";
    case "/delete":
      return "Delete Help: Use /help delete for deletion syntax and targeting.";
    default:
      return "General Help: Use /help to see all available commands and formats.";
  }
}

/**
 * Get specific error message for create command failures
 */
function getCreateErrorMessage(error: unknown, text: string): string {
  const isParsingError = text.includes("{") && !text.includes("}");
  const isMissingFields =
    !text.includes("title") || !text.includes("startTime");

  if (isParsingError) {
    return (
      `JSON Parsing Error\n\n` +
      `Common issues:\n` +
      `• Missing closing braces }\n` +
      `• Unescaped quotes in strings\n` +
      `• Missing commas between fields\n\n` +
      `Type /help create for format examples.`
    );
  }

  if (isMissingFields) {
    return (
      `Missing Required Fields\n\n` +
      `Required fields:\n` +
      `• title - Event name\n` +
      `• startTime - ISO date string\n\n` +
      `Type /help create for detailed format.`
    );
  }

  const errorString = error instanceof Error ? error.message : String(error);
  const isNetworkError =
    errorString.includes("network") || errorString.includes("timeout");

  if (isNetworkError) {
    return (
      `Connection Error\n\n` +
      `Unable to reach the LoomCal API.\n\n` +
      `Please try:\n` +
      `• Check your internet connection\n` +
      `• Verify API key is still valid\n` +
      `• Try again in a few moments\n\n` +
      `Type /help create if you need assistance.`
    );
  }

  return (
    `Event Creation Failed\n\n` +
    `Please check:\n` +
    `• All required fields are provided\n` +
    `• Date/time format is correct (ISO 8601)\n` +
    `• JSON syntax is valid\n` +
    `• API key has proper permissions\n\n` +
    `Need help? Type /help create for format and troubleshooting.`
  );
}
export async function handleMessage(
  message: TelegramMessage["message"]
): Promise<void> {
  const { chat, text, from } = message;
  const chatId = chat.id;
  const userId = from.id;

  if (!text) {
    await sendMessage(chatId, ERROR_MESSAGES.INVALID_COMMAND);
    return;
  }

  // Handle non-command messages
  if (!text.startsWith("/")) {
    await sendMessage(
      chatId,
      "Please use a valid command. Type /help for available commands."
    );
    return;
  }

  try {
    const command = text.split(" ")[0].toLowerCase();

    switch (command) {
      case "/start":
        await handleStartCommand(chatId);
        break;
      case COMMANDS.SETUP:
        await handleSetupCommand(chatId, userId, text);
        break;
      case COMMANDS.CREATE:
        await handleCreateCommand(chatId, userId, text);
        break;
      case COMMANDS.GET:
        await handleGetCommand(chatId, userId, text);
        break;
      case COMMANDS.UPDATE:
        await handleUpdateCommand(chatId, userId, text);
        break;
      case COMMANDS.DELETE:
        await handleDeleteCommand(chatId, userId, text);
        break;
      case "/help":
        await handleHelpCommand(chatId, text);
        break;
      default:
        await sendMessage(
          chatId,
          `Unknown command: ${command}\n\n` +
            `Available commands:\n` +
            `• ${COMMANDS.SETUP} - Configure bot\n` +
            `• ${COMMANDS.CREATE} - Create events\n` +
            `• ${COMMANDS.GET} - Get events\n` +
            `• ${COMMANDS.UPDATE} - Update events\n` +
            `• ${COMMANDS.DELETE} - Delete events\n` +
            `• /help - Show detailed help\n\n` +
            `Type /help [command] for specific command help.`
        );
    }
  } catch (error) {
    console.error("Error handling message:", error);
    await sendMessage(
      chatId,
      `An error occurred while processing your command.\n\n` +
        `${getErrorSuggestion(text)}\n\n` +
        `Type /help for command usage examples.`
    );
  }
}

/**
 * Handle setup command
 */
async function handleSetupCommand(
  chatId: number,
  userId: number,
  text: string
): Promise<void> {
  const flags = extractFlags(text);
  const sequence = extractSequence(text);

  let apiKey: string;

  // Extract from flags first
  if (flags[FLAGS.API]) {
    apiKey = flags[FLAGS.API] as string;
  } else if (sequence[0]) {
    apiKey = sequence[0];
  } else {
    await sendMessage(
      chatId,
      `Missing API Key\n\n` +
        `Correct usage:\n` +
        `/setup YOUR_API_KEY\n` +
        `/setup -api YOUR_API_KEY (with flag)\n\n` +
        `Need help? Type /help setup for detailed instructions.`
    );
    return;
  }

  if (!validateApiKey(apiKey)) {
    await sendMessage(
      chatId,
      `Invalid API Key Format\n\n` +
        `API keys should be at least 10 characters and contain only letters, numbers, underscores, and hyphens.\n\n` +
        `Example format: abc123_xyz789\n\n` +
        `Type /help setup for more information.`
    );
    return;
  }

  // Extract optional parameters
  const baseUrl = (flags[FLAGS.BASE] as string) || sequence[1];
  const timeout =
    (flags[FLAGS.TIMEOUT] as number) ||
    (sequence[2] ? parseInt(sequence[2], 10) : undefined);
  const retries =
    (flags[FLAGS.RETRIES] as number) ||
    (sequence[3] ? parseInt(sequence[3], 10) : undefined);

  // Store configuration
  userConfigs.set(userId, {
    apiKey,
    baseUrl,
    timeout,
    retries,
  });

  await sendMessage(
    chatId,
    `Setup Complete!\n\n` +
      `API key configured successfully!\n` +
      `You can now create and manage events.\n\n` +
      `Next steps:\n` +
      `• /create - Create your first event\n` +
      `• /get - View your events\n` +
      `• /help - See all available commands`
  );
}

/**
 * Handle create command
 */
async function handleCreateCommand(
  chatId: number,
  userId: number,
  text: string
): Promise<void> {
  const config = userConfigs.get(userId);
  if (!config) {
    await sendMessage(
      chatId,
      `Not Configured\n\n` +
        `Please setup your API key first:\n` +
        `/setup YOUR_API_KEY\n\n` +
        `Need help? Type /help setup for detailed instructions.`
    );
    return;
  }

  try {
    const loomCalClient = new LoomCal({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retries: config.retries,
    });

    const parsedData = parseCreateEventData(text);
    const { event: eventData, options } = parsedData;

    const result = await loomCalClient
      .createEvents({
        event: {
          title: (eventData.title as string) || "Telegram Event",
          description: eventData.description as string,
          startTime: eventData.startTime as string,
          endTime: eventData.endTime as string,
          type: eventData.type as string,
          repeat: eventData.repeat as string,
          color: eventData.color as string,
          resource: eventData.resource as string,
          customData: eventData.customData as Record<string, unknown>,
          user: {
            identifier: `telegram-${userId}`,
            email: `telegram-${userId}@loomcal.bot`,
            name: `Telegram User ${userId}`,
          },
        },
        options:
          Object.keys(options).length > 0
            ? toCreateOptions(options)
            : undefined,
      })
      .execute();

    if (result.success) {
      await sendMessage(
        chatId,
        `Event Created Successfully!\n\n` +
          `Your event has been created and scheduled.\n\n` +
          `Next steps:\n` +
          `• /get - View your events\n` +
          `• /update - Modify event details\n` +
          `• /help - See all available commands`
      );
    } else {
      await sendMessage(
        chatId,
        `Failed to Create Event\n\n` +
          `Please check:\n` +
          `• Required fields are provided\n` +
          `• Date/time format is correct\n` +
          `• JSON syntax is valid\n\n` +
          `Need help? Type /help create for examples.`
      );
    }
  } catch (error) {
    console.error("Error creating event:", error);

    // Provide specific error guidance
    const errorMessage = getCreateErrorMessage(error, text);
    await sendMessage(chatId, errorMessage);
  }
}

/**
 * Handle get command
 */
async function handleGetCommand(
  chatId: number,
  userId: number,
  text: string
): Promise<void> {
  const config = userConfigs.get(userId);
  if (!config) {
    await sendMessage(chatId, ERROR_MESSAGES.NO_CONFIG);
    return;
  }

  try {
    const loomCalClient = new LoomCal({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retries: config.retries,
    });

    const queryData = parseGetEventData(text);

    const result = await loomCalClient
      .getEvents({
        target: queryData.target,
        options: toOperationOptions(queryData.options),
      })
      .execute();

    if (result.success) {
      const events = result.operations[0]?.result?.results?.[0]?.data || [];
      const message = formatEventsResponse(events);
      await sendMessage(chatId, message);
    } else {
      await sendMessage(chatId, `Error: Failed to get events`);
    }
  } catch (error) {
    console.error("Error getting events:", error);
    await sendMessage(chatId, ERROR_MESSAGES.API_ERROR);
  }
}

/**
 * Handle update command
 */
async function handleUpdateCommand(
  chatId: number,
  userId: number,
  text: string
): Promise<void> {
  const config = userConfigs.get(userId);
  if (!config) {
    await sendMessage(chatId, ERROR_MESSAGES.NO_CONFIG);
    return;
  }

  try {
    const loomCalClient = new LoomCal({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retries: config.retries,
    });

    const updateData = parseUpdateEventData(text);

    const result = await loomCalClient
      .updateEvents({
        target: updateData.target,
        updates: updateData.updates,
        options: toOperationOptions(updateData.options),
      })
      .execute();

    if (result.success) {
      await sendMessage(chatId, SUCCESS_MESSAGES.EVENTS_UPDATED);
    } else {
      await sendMessage(chatId, `Error: Failed to update events`);
    }
  } catch (error) {
    console.error("Error updating events:", error);
    await sendMessage(chatId, ERROR_MESSAGES.API_ERROR);
  }
}

/**
 * Handle delete command
 */
async function handleDeleteCommand(
  chatId: number,
  userId: number,
  text: string
): Promise<void> {
  const config = userConfigs.get(userId);
  if (!config) {
    await sendMessage(chatId, ERROR_MESSAGES.NO_CONFIG);
    return;
  }

  try {
    const loomCalClient = new LoomCal({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retries: config.retries,
    });

    const deleteData = parseDeleteEventData(text);

    const result = await loomCalClient
      .deleteEvents({
        target: deleteData.target,
        options: toOperationOptions(deleteData.options),
      })
      .execute();

    if (result.success) {
      await sendMessage(chatId, SUCCESS_MESSAGES.EVENTS_DELETED);
    } else {
      await sendMessage(chatId, `Error: Failed to delete events`);
    }
  } catch (error) {
    console.error("Error deleting events:", error);
    await sendMessage(chatId, ERROR_MESSAGES.API_ERROR);
  }
}

/**
 * Parse create event data from command text
 */
function parseCreateEventData(text: string): {
  event: Record<string, unknown>;
  options: ParsedOptions;
} {
  const flags = extractFlags(text);
  const sequence = extractSequence(text);

  // Extract and normalize options (removes stopOnError, applies defaults)
  const extractedOptions = extractOptions(text);
  const normalizedOptions = normalizeOptions(extractedOptions);

  const eventData: Record<string, unknown> = {};
  const options = normalizedOptions;

  // Map sequence to fields
  const sequenceFields = SEQUENCES.CREATE;
  sequence.forEach((value, index) => {
    if (sequenceFields[index] && value) {
      // Handle repeat field specially to convert to number
      if (sequenceFields[index] === "repeat") {
        if (typeof value === "string" && !isNaN(Number(value))) {
          eventData[sequenceFields[index]] = Number(value);
        } else {
          eventData[sequenceFields[index]] = value;
        }
      } else {
        eventData[sequenceFields[index]] = value;
      }
    }
  });

  // Map flags to fields
  if (flags[FLAGS.TITLE]) eventData.title = flags[FLAGS.TITLE];
  if (flags[FLAGS.DESCRIPTION])
    eventData.description = flags[FLAGS.DESCRIPTION];
  if (flags[FLAGS.TYPE]) eventData.type = flags[FLAGS.TYPE];
  if (flags[FLAGS.COLOR]) eventData.color = flags[FLAGS.COLOR];
  if (flags[FLAGS.RESOURCE]) eventData.resource = flags[FLAGS.RESOURCE];
  if (flags[FLAGS.CUSTOM]) eventData.customData = flags[FLAGS.CUSTOM];
  if (flags[FLAGS.REPEAT]) {
    // Keep repeat as string as expected by API
    eventData.repeat = flags[FLAGS.REPEAT];
  }

  // Handle time flags
  if (flags[FLAGS.RELATIVE_TIME]) {
    const rtFlag = flags[FLAGS.RELATIVE_TIME] as ParsedFlags;
    if (typeof rtFlag === "object" && rtFlag !== null) {
      if (rtFlag[FLAGS.START]) {
        eventData.startTime = convertRelativeTime(
          rtFlag[FLAGS.START] as number
        );
      }
      if (rtFlag[FLAGS.END]) {
        eventData.endTime = convertRelativeTime(rtFlag[FLAGS.END] as number);
      }
    }
  }

  if (flags[FLAGS.ABSOLUTE_TIME]) {
    const atFlag = flags[FLAGS.ABSOLUTE_TIME] as ParsedFlags;
    if (typeof atFlag === "object" && atFlag !== null) {
      if (atFlag[FLAGS.START]) {
        eventData.startTime = atFlag[FLAGS.START];
      }
      if (atFlag[FLAGS.END]) {
        eventData.endTime = atFlag[FLAGS.END];
      }
    }
  }

  return { event: eventData, options };
}

/**
 * Process a single operator and return the corresponding MongoDB query condition
 * Handles both field-level and document-level operators
 */
function processOperator(operator: {
  operator: string;
  args: unknown[];
}): Record<string, unknown> | null {
  console.log(`Processing operator ${operator.operator}:`, {
    operator: operator.operator,
    args: operator.args,
    operatorType: DOCUMENT_LEVEL_OPERATORS.includes(
      operator.operator as (typeof DOCUMENT_LEVEL_OPERATORS)[number]
    )
      ? "document-level"
      : SINGLE_ARG_OPERATORS.includes(
          operator.operator as (typeof SINGLE_ARG_OPERATORS)[number]
        )
      ? "single"
      : MULTI_ARG_OPERATORS.includes(
          operator.operator as (typeof MULTI_ARG_OPERATORS)[number]
        )
      ? "multi"
      : "unknown",
  });

  // Handle document-level operators ($and, $or, $not)
  if (
    DOCUMENT_LEVEL_OPERATORS.includes(
      operator.operator as (typeof DOCUMENT_LEVEL_OPERATORS)[number]
    )
  ) {
    const [field, value] = operator.args;
    const fieldName = mapFlagToFieldName(field as string);

    if (!fieldName) {
      console.log(`Unknown field flag: ${field}`);
      return null;
    }

    if (Array.isArray(value)) {
      // Create document-level conditions where each value applies to the same field
      console.log(
        `Processing document-level ${operator.operator} with values:`,
        value
      );

      const conditions = value.map((val) => {
        if (typeof val === "object" && val !== null) {
          // Nested operator: { title: { $regex: "pattern" } }
          return { [fieldName]: val };
        } else {
          // Simple value: { title: { $eq: "value" } }
          return { [fieldName]: { $eq: val } };
        }
      });

      console.log(`Creating document-level ${operator.operator} query:`, {
        [operator.operator]: conditions,
      });

      return {
        [operator.operator]: conditions,
      };
    } else {
      // Single value for document-level operator
      const condition =
        typeof value === "object" && value !== null
          ? { [fieldName]: value }
          : { [fieldName]: { $eq: value } };

      return {
        [operator.operator]: [condition],
      };
    }
  }

  // Handle field-level operators (all others)
  const [field, value] = operator.args;

  // Convert field flag to field name
  const fieldName = mapFlagToFieldName(field as string);
  if (!fieldName) {
    console.log(`Unknown field flag: ${field}`);
    return null;
  }

  // Handle single-argument operators
  if (
    SINGLE_ARG_OPERATORS.includes(
      operator.operator as (typeof SINGLE_ARG_OPERATORS)[number]
    )
  ) {
    console.log(
      `Creating single-arg query: ${fieldName}: { ${
        operator.operator
      }: ${JSON.stringify(value)} }`
    );
    return {
      [fieldName]: {
        [operator.operator]: value,
      },
    };
  }

  // Handle multi-argument operators ($in, $nin)
  if (
    MULTI_ARG_OPERATORS.includes(
      operator.operator as (typeof MULTI_ARG_OPERATORS)[number]
    )
  ) {
    if (Array.isArray(value)) {
      console.log(`Processing ${operator.operator} with values:`, value);

      // For $in/$nin: MongoDB supports operators directly inside arrays
      // e.g., { field: { $in: [{ $regex: "pattern" }, "literal", { $ne: "value" }] } }
      const processedValues = value.map((val) => {
        if (typeof val === "object" && val !== null) {
          // Keep nested operator objects as-is
          return val;
        } else {
          // Keep simple values as-is
          return val;
        }
      });

      console.log(`Creating ${operator.operator} query:`, {
        [fieldName]: { [operator.operator]: processedValues },
      });
      return {
        [fieldName]: {
          [operator.operator]: processedValues,
        },
      };
    } else {
      console.log(`Creating single ${operator.operator} query:`, {
        [fieldName]: { [operator.operator]: [value] },
      });
      return {
        [fieldName]: {
          [operator.operator]: [value],
        },
      };
    }
  }

  console.log(`Unknown operator: ${operator.operator}`);
  return null;
}

/**
 * Parse get event data from command text
 * Using similar approach to createEvents for consistency
 */
function parseGetEventData(text: string): ParsedEventData {
  const flags = extractFlags(text);
  const operators = extractOperators(text);
  const sequence = extractSequence(text);

  // Check if operators are being used (like $or, $and, etc.)
  const hasOperators =
    operators.length > 0 ||
    Object.values(OPERATORS).some((op) => text.includes(op));

  let target: Record<string, unknown> = {};

  if (hasOperators) {
    // Handle operators manually for better control
    console.log(
      "USING MANUAL OPERATOR PARSING - Operators detected:",
      operators
    );
    console.log("Text contains operators:", text);

    if (operators.length > 1) {
      // Multiple operators - combine them with $and by default
      console.log("Multiple operators detected, combining with $and");
      const allConditions: Record<string, unknown>[] = [];

      operators.forEach((operator) => {
        const operatorCondition = processOperator(operator);
        if (operatorCondition && Object.keys(operatorCondition).length > 0) {
          allConditions.push(operatorCondition);
        }
      });

      if (allConditions.length > 1) {
        target = { $and: allConditions };
      } else if (allConditions.length === 1) {
        target = allConditions[0];
      }
    } else if (operators.length === 1) {
      // Single operator
      const operatorCondition = processOperator(operators[0]);
      if (operatorCondition && Object.keys(operatorCondition).length > 0) {
        target = operatorCondition;
      }
    }
  } else {
    // Use direct field mapping for simple queries
    console.log("USING DIRECT MAPPING - No operators detected");

    // Map sequence to fields (same order as CREATE sequence)
    const sequenceFields = SEQUENCES.GET;
    sequence.forEach((value, index) => {
      if (sequenceFields[index] && value) {
        // Handle repeat field specially to convert to number
        if (sequenceFields[index] === "repeat") {
          if (typeof value === "string" && !isNaN(Number(value))) {
            target[sequenceFields[index]] = Number(value);
          } else {
            target[sequenceFields[index]] = value;
          }
        } else {
          target[sequenceFields[index]] = value;
        }
      }
    });

    // Map flags to fields (same as create event)
    if (flags[FLAGS.TITLE]) target.title = flags[FLAGS.TITLE];
    if (flags[FLAGS.DESCRIPTION]) target.description = flags[FLAGS.DESCRIPTION];
    if (flags[FLAGS.TYPE]) target.type = flags[FLAGS.TYPE];
    if (flags[FLAGS.COLOR]) target.color = flags[FLAGS.COLOR];
    if (flags[FLAGS.RESOURCE]) target.resource = flags[FLAGS.RESOURCE];
    if (flags[FLAGS.CUSTOM]) target.customData = flags[FLAGS.CUSTOM];
    if (flags[FLAGS.REPEAT]) {
      // Convert repeat to number if it's a valid number
      const repeatValue = flags[FLAGS.REPEAT];
      if (typeof repeatValue === "string" && !isNaN(Number(repeatValue))) {
        target.repeat = Number(repeatValue);
      } else {
        target.repeat = repeatValue;
      }
    }

    // Handle time flags
    if (flags[FLAGS.RELATIVE_TIME]) {
      const rtFlag = flags[FLAGS.RELATIVE_TIME] as ParsedFlags;
      if (typeof rtFlag === "object" && rtFlag !== null) {
        if (rtFlag[FLAGS.START]) {
          target.startTime = convertRelativeTime(rtFlag[FLAGS.START] as number);
        }
        if (rtFlag[FLAGS.END]) {
          target.endTime = convertRelativeTime(rtFlag[FLAGS.END] as number);
        }
      }
    }

    if (flags[FLAGS.ABSOLUTE_TIME]) {
      const atFlag = flags[FLAGS.ABSOLUTE_TIME] as ParsedFlags;
      if (typeof atFlag === "object" && atFlag !== null) {
        if (atFlag[FLAGS.START]) {
          target.startTime = atFlag[FLAGS.START];
        }
        if (atFlag[FLAGS.END]) {
          target.endTime = atFlag[FLAGS.END];
        }
      }
    }
  }

  // Extract and normalize options (removes stopOnError, applies defaults)
  const extractedOptions = extractOptions(text);
  const finalOptions = normalizeOptions(extractedOptions);

  // Extract filter object if present
  const filterObject = extractFilter(text);

  // Merge filter object into target if it exists
  if (filterObject && Object.keys(filterObject).length > 0) {
    if (Object.keys(target).length > 0) {
      // If target already has conditions, combine with $and
      target = {
        $and: [target, filterObject],
      };
    } else {
      // If target is empty, use filter directly
      target = filterObject;
    }
  }

  console.log("PARSED GET TARGET:", JSON.stringify(target, null, 2));

  return {
    target: target,
    options: finalOptions,
  };
}

/**
 * Parse update event data from command text
 * Using similar approach to createEvents for consistency
 */
function parseUpdateEventData(text: string): ParsedUpdateData {
  const parts = text.split(FLAGS.TO);
  if (parts.length < 2) {
    throw new Error("Update command requires -to flag");
  }

  const targetPart = parts[0];
  const updatePart = parts[1];

  // Parse target part (what to find) - now with operator support
  const targetFlags = extractFlags(targetPart);
  const targetOperators = extractOperators(targetPart);
  const targetSequence = extractSequence(targetPart);

  // Check if operators are being used in target
  const hasOperators =
    targetOperators.length > 0 ||
    Object.values(OPERATORS).some((op) => targetPart.includes(op));

  let target: Record<string, unknown> = {};

  if (hasOperators) {
    // Handle operators for target part
    console.log(
      "UPDATE TARGET USING OPERATOR PARSING - Operators detected:",
      targetOperators
    );

    if (targetOperators.length > 1) {
      // Multiple operators - combine them with $and by default
      console.log("Multiple operators detected in target, combining with $and");
      const allConditions: Record<string, unknown>[] = [];

      targetOperators.forEach((operator) => {
        const operatorCondition = processOperator(operator);
        if (operatorCondition && Object.keys(operatorCondition).length > 0) {
          allConditions.push(operatorCondition);
        }
      });

      if (allConditions.length > 1) {
        target = { $and: allConditions };
      } else if (allConditions.length === 1) {
        target = allConditions[0];
      }
    } else if (targetOperators.length === 1) {
      // Single operator
      const operatorCondition = processOperator(targetOperators[0]);
      if (operatorCondition && Object.keys(operatorCondition).length > 0) {
        target = operatorCondition;
      }
    }
  } else {
    // Use direct field mapping for simple target queries
    console.log("UPDATE TARGET USING DIRECT MAPPING - No operators detected");

    // Map sequence to fields for target
    const sequenceFields = SEQUENCES.GET; // Same as GET for targeting
    targetSequence.forEach((value, index) => {
      if (sequenceFields[index] && value) {
        target[sequenceFields[index]] = value;
      }
    });

    // Map flags to fields for target
    if (targetFlags[FLAGS.TITLE]) target.title = targetFlags[FLAGS.TITLE];
    if (targetFlags[FLAGS.DESCRIPTION])
      target.description = targetFlags[FLAGS.DESCRIPTION];
    if (targetFlags[FLAGS.TYPE]) target.type = targetFlags[FLAGS.TYPE];
    if (targetFlags[FLAGS.COLOR]) target.color = targetFlags[FLAGS.COLOR];
    if (targetFlags[FLAGS.RESOURCE])
      target.resource = targetFlags[FLAGS.RESOURCE];
    if (targetFlags[FLAGS.REPEAT]) {
      // Convert repeat to number if it's a valid number
      const repeatValue = targetFlags[FLAGS.REPEAT];
      if (typeof repeatValue === "string" && !isNaN(Number(repeatValue))) {
        target.repeat = Number(repeatValue);
      } else {
        target.repeat = repeatValue;
      }
    }
  }

  // Parse update part (what to change)
  const updateFlags = extractFlags(updatePart);
  const updateSequence = extractSequence(updatePart);

  const updates: Record<string, unknown> = {};

  // Map sequence to fields for updates (updates don't need user)
  const updateSequenceFields = [
    "title",
    "description",
    "type",
    "repeat",
    "color",
    "resource",
  ];
  updateSequence.forEach((value, index) => {
    if (updateSequenceFields[index] && value) {
      // Handle repeat field specially to convert to number
      if (updateSequenceFields[index] === "repeat") {
        if (typeof value === "string" && !isNaN(Number(value))) {
          updates[updateSequenceFields[index]] = Number(value);
        } else {
          updates[updateSequenceFields[index]] = value;
        }
      } else {
        updates[updateSequenceFields[index]] = value;
      }
    }
  });

  // Map flags to fields for updates
  if (updateFlags[FLAGS.TITLE]) updates.title = updateFlags[FLAGS.TITLE];
  if (updateFlags[FLAGS.DESCRIPTION])
    updates.description = updateFlags[FLAGS.DESCRIPTION];
  if (updateFlags[FLAGS.TYPE]) updates.type = updateFlags[FLAGS.TYPE];
  if (updateFlags[FLAGS.COLOR]) updates.color = updateFlags[FLAGS.COLOR];
  if (updateFlags[FLAGS.RESOURCE])
    updates.resource = updateFlags[FLAGS.RESOURCE];
  if (updateFlags[FLAGS.CUSTOM]) updates.customData = updateFlags[FLAGS.CUSTOM];
  if (updateFlags[FLAGS.REPEAT]) {
    // Convert repeat to number if it's a valid number
    const repeatValue = updateFlags[FLAGS.REPEAT];
    if (typeof repeatValue === "string" && !isNaN(Number(repeatValue))) {
      updates.repeat = Number(repeatValue);
    } else {
      updates.repeat = repeatValue;
    }
  }

  // Handle options from extracted options and apply defaults
  const extractedOptions = extractOptions(text);
  const finalOptions = normalizeOptions(extractedOptions);

  // Extract filter object if present (from the full command text)
  const filterObject = extractFilter(text);

  // Merge filter object into target if it exists
  if (filterObject && Object.keys(filterObject).length > 0) {
    if (Object.keys(target).length > 0) {
      // If target already has conditions, combine with $and
      target = {
        $and: [target, filterObject],
      };
    } else {
      // If target is empty, use filter directly
      target = filterObject;
    }
  }

  console.log("PARSED UPDATE TARGET:", JSON.stringify(target, null, 2));
  console.log("PARSED UPDATE UPDATES:", JSON.stringify(updates, null, 2));

  return {
    target: target,
    updates: updates,
    options: finalOptions,
  };
}

/**
 * Parse delete event data from command text
 * Using similar approach to parseGetEventData with operator support
 */
function parseDeleteEventData(text: string): ParsedDeleteData {
  const flags = extractFlags(text);
  const operators = extractOperators(text);
  const sequence = extractSequence(text);

  // Check if operators are being used
  const hasOperators =
    operators.length > 0 ||
    Object.values(OPERATORS).some((op) => text.includes(op));

  let target: Record<string, unknown> = {};

  if (hasOperators) {
    // Handle operators for delete target
    console.log(
      "DELETE TARGET USING OPERATOR PARSING - Operators detected:",
      operators
    );

    if (operators.length > 1) {
      // Multiple operators - combine them with $and by default
      console.log("Multiple operators detected in delete, combining with $and");
      const allConditions: Record<string, unknown>[] = [];

      operators.forEach((operator) => {
        const operatorCondition = processOperator(operator);
        if (operatorCondition && Object.keys(operatorCondition).length > 0) {
          allConditions.push(operatorCondition);
        }
      });

      if (allConditions.length > 1) {
        target = { $and: allConditions };
      } else if (allConditions.length === 1) {
        target = allConditions[0];
      }
    } else if (operators.length === 1) {
      // Single operator
      const operatorCondition = processOperator(operators[0]);
      if (operatorCondition && Object.keys(operatorCondition).length > 0) {
        target = operatorCondition;
      }
    }
  } else {
    // Use direct field mapping for simple delete queries
    console.log("DELETE TARGET USING DIRECT MAPPING - No operators detected");

    // Map sequence to fields (same as GET for targeting)
    const sequenceFields = SEQUENCES.DELETE;
    sequence.forEach((value, index) => {
      if (sequenceFields[index] && value) {
        // For delete, the sequence is just ["target"], so map first arg to title
        if (index === 0) {
          target.title = value;
        }
      }
    });

    // Map flags to fields for targeting
    if (flags[FLAGS.TITLE]) target.title = flags[FLAGS.TITLE];
    if (flags[FLAGS.DESCRIPTION]) target.description = flags[FLAGS.DESCRIPTION];
    if (flags[FLAGS.TYPE]) target.type = flags[FLAGS.TYPE];
    if (flags[FLAGS.COLOR]) target.color = flags[FLAGS.COLOR];
    if (flags[FLAGS.RESOURCE]) target.resource = flags[FLAGS.RESOURCE];
    if (flags[FLAGS.CUSTOM]) target.customData = flags[FLAGS.CUSTOM];

    // Handle time flags for targeting
    if (flags[FLAGS.RELATIVE_TIME]) {
      const rtFlag = flags[FLAGS.RELATIVE_TIME] as ParsedFlags;
      if (typeof rtFlag === "object" && rtFlag !== null) {
        if (rtFlag[FLAGS.START]) {
          target.startTime = convertRelativeTime(rtFlag[FLAGS.START] as number);
        }
        if (rtFlag[FLAGS.END]) {
          target.endTime = convertRelativeTime(rtFlag[FLAGS.END] as number);
        }
      }
    }

    if (flags[FLAGS.ABSOLUTE_TIME]) {
      const atFlag = flags[FLAGS.ABSOLUTE_TIME] as ParsedFlags;
      if (typeof atFlag === "object" && atFlag !== null) {
        if (atFlag[FLAGS.START]) {
          target.startTime = atFlag[FLAGS.START];
        }
        if (atFlag[FLAGS.END]) {
          target.endTime = atFlag[FLAGS.END];
        }
      }
    }
  }

  // Handle options from extracted options and apply defaults
  const extractedOptions = extractOptions(text);
  const finalOptions = normalizeOptions(extractedOptions);

  // Extract filter object if present
  const filterObject = extractFilter(text);

  // Merge filter object into target if it exists
  if (filterObject && Object.keys(filterObject).length > 0) {
    if (Object.keys(target).length > 0) {
      // If target already has conditions, combine with $and
      target = {
        $and: [target, filterObject],
      };
    } else {
      // If target is empty, use filter directly
      target = filterObject;
    }
  }

  console.log("PARSED DELETE TARGET:", JSON.stringify(target, null, 2));

  return {
    target: target,
    options: finalOptions,
  };
}

/**
 * Format events response for Telegram with markdown
 */
function formatEventsResponse(events: Record<string, unknown>[]): string {
  if (!events || events.length === 0) {
    return "No events found.";
  }

  const formattedEvents = events.slice(0, 10).map((event, index) => {
    const parts: string[] = [];

    // Title (always show)
    const title = event.title || "Untitled Event";
    parts.push(`${index + 1}\\. *${escapeMarkdown(title as string)}*`);

    // Description
    if (event.description) {
      parts.push(`📝 ${escapeMarkdown(event.description as string)}`);
    }

    // Type
    if (event.type) {
      parts.push(`🏷️ Type: \`${escapeMarkdown(event.type as string)}\``);
    }

    // Start Time
    if (event.startTime) {
      const startTime = new Date(event.startTime as string).toLocaleString();
      parts.push(`🕒 Start: \`${startTime}\``);
    }

    // End Time
    if (event.endTime) {
      const endTime = new Date(event.endTime as string).toLocaleString();
      parts.push(`🕕 End: \`${endTime}\``);
    }

    // Repeat
    if (event.repeat !== null && event.repeat !== undefined) {
      parts.push(`🔄 Repeat: \`${event.repeat}\``);
    }

    // Color
    if (event.color) {
      parts.push(`🎨 Color: \`${event.color}\``);
    }

    // Resource
    if (event.resource) {
      parts.push(`🔗 Resource: [Link](${event.resource})`);
    }

    // Custom Data (if not empty)
    if (event.customData && typeof event.customData === "object") {
      const customData = event.customData as Record<string, unknown>;
      const customKeys = Object.keys(customData);
      if (customKeys.length > 0) {
        const customStr = customKeys
          .map((key) => `${key}: ${customData[key]}`)
          .join(", ");
        parts.push(`📊 Custom: \`${escapeMarkdown(customStr)}\``);
      }
    }

    // ID (for reference)
    if (event.id) {
      parts.push(`🆔 ID: \`${event.id}\``);
    }

    return parts.join("\n   ");
  });

  const message = `Found ${events.length} event(s):\n\n${formattedEvents.join(
    "\n\n"
  )}`;

  if (events.length > 10) {
    return message + `\n\n\\.\\.\\. and ${events.length - 10} more events`;
  }

  return message;
}

/**
 * Escape markdown special characters for Telegram
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, "\\$&");
}

/**
 * Convert flag to field name
 */
function mapFlagToFieldName(flag: string): string | null {
  const flagMap: Record<string, string> = {
    [FLAGS.TITLE]: "title",
    [FLAGS.DESCRIPTION]: "description",
    [FLAGS.TYPE]: "type",
    [FLAGS.REPEAT]: "repeat",
    [FLAGS.COLOR]: "color",
    [FLAGS.RESOURCE]: "resource",
    [FLAGS.CUSTOM]: "customData",
    [FLAGS.OPTIONS]: "options",
  };

  return flagMap[flag] || null;
}
