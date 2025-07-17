import { getAxiosInstance } from "@/app/api/bots/telegram/_controller/lib/axios";
import { LoomCal } from "@/sdk";
import {
  validateApiKey,
  convertRelativeTime,
} from "@/app/api/bots/telegram/_controller/lib/helpers";
import {
  extractFlags,
  splitByFlags,
  parseTimeFlags,
} from "@/app/api/bots/telegram/_controller/lib/flags";
import {
  extractSequence,
  parseSequentialValues,
} from "@/app/api/bots/telegram/_controller/lib/sequences";
import {
  parseValue,
  parseCriticalObject,
} from "@/app/api/bots/telegram/_controller/lib/parsers";
import {
  separateCombinedJSONObjects,
  processTimeValue,
  mapFlagToFieldName,
} from "@/app/api/bots/telegram/_controller/lib/utils";
import { ParsedOptions } from "@/app/api/bots/telegram/_controller/lib/types";
import {
  parseOperatorArgs,
  createOperatorQuery,
} from "@/app/api/bots/telegram/_controller/lib/operators";
import { handleCreateCommand } from "@/app/api/bots/telegram/_controller/lib/createEvent";
import { handleUpdateCommand } from "@/app/api/bots/telegram/_controller/lib/updateEvent";
import { handleDeleteCommand } from "@/app/api/bots/telegram/_controller/lib/deleteEvent";
import { handleGetCommand } from "@/app/api/bots/telegram/_controller/lib/getEvent";
import {
  COMMANDS,
  FLAGS,
  OPERATORS,
  SEQUENCES,
  ERROR_MESSAGES,
  HELP_MESSAGES,
} from "@/app/api/bots/telegram/_controller/lib/constants";
import {
  bold,
  italic,
  inlineCode,
  codeBlock,
  link,
  escapeMarkdown,
} from "@/app/api/bots/telegram/_controller/lib/formatting";

// User configuration storage
const userConfigs = new Map<
  number,
  {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
    debug?: boolean;
  }
>();

async function getUserConfig(
  userId: number,
  userInfo?: { first_name?: string; last_name?: string }
): Promise<{
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
} | null> {
  try {
    const memoryConfig = userConfigs.get(userId);
    if (memoryConfig) {
      return memoryConfig;
    }

    const tempApiKey = process.env.LOOMCAL_API_KEY;
    if (!tempApiKey) {
      console.error("LOOMCAL_API_KEY environment variable not set");
      return null;
    }

    const databaseConfig = await loadUserConfigFromDatabase(
      userId,
      tempApiKey,
      userInfo
    );
    if (databaseConfig) {
      return databaseConfig;
    }

    return null;
  } catch {
    return null;
  }
}

async function saveUserConfig(
  userId: number,
  userInfo: { first_name?: string; last_name?: string },
  config: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
    debug?: boolean;
  }
): Promise<boolean> {
  try {
    const loomCalClient = new LoomCal({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retries: config.retries,
    });

    const identifier = `${userInfo.first_name || "Unknown"}-${userId}`;

    const result = await loomCalClient
      .createUsers({
        user: {
          identifier,
          customData: {
            botConfig: {
              apiKey: config.apiKey,
              baseUrl: config.baseUrl,
              retries: config.retries,
              timeout: config.timeout,
              debug: config.debug,
            },
          },
        },
      })
      .execute();

    if (result.success) {
      userConfigs.set(userId, config);
      return true;
    } else {
      return false;
    }
  } catch {
    userConfigs.set(userId, config);
    return false;
  }
}

async function loadUserConfigFromDatabase(
  userId: number,
  tempApiKey: string,
  userInfo?: { first_name?: string; last_name?: string }
): Promise<{
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
} | null> {
  try {
    const tempClient = new LoomCal({
      apiKey: tempApiKey,
      baseUrl: process.env.NEXT_PUBLIC_LOOMCAL_BASE_URL,
    });

    const identifier = `${userInfo?.first_name || "Unknown"}-${userId}`;

    const result = await tempClient
      .getUsers({
        target: { identifier },
        options: { limit: 1 },
      })
      .execute();

    if (result.success) {
      const users = result.operations[0]?.result?.results?.[0]?.data || [];
      if (users.length > 0) {
        const user = users[0];
        const botConfig = user.customData?.botConfig;

        if (botConfig && botConfig.apiKey) {
          const config = {
            apiKey: botConfig.apiKey,
            baseUrl: botConfig.baseUrl,
            timeout: botConfig.timeout,
            retries: botConfig.retries,
            debug: botConfig.debug,
          };

          userConfigs.set(userId, config);
          return config;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

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

export async function sendMessage(
  chatId: number,
  text: string,
  options?: { parse_mode?: string; disable_web_page_preview?: boolean }
): Promise<void> {
  try {
    const telegramApi = getAxiosInstance();
    const defaultParseMode =
      options?.parse_mode !== undefined ? options.parse_mode : "Markdown";

    await telegramApi.post("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: defaultParseMode,
      disable_web_page_preview: true,
      ...options,
    });
  } catch (error) {
    console.error(
      "Telegram API error with Markdown, trying plain text:",
      error
    );
    console.error("Message content:", text);

    try {
      const telegramApi = getAxiosInstance();
      await telegramApi.post("sendMessage", {
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
        ...options,
      });
    } catch (fallbackError) {
      console.error("Plain text also failed:", fallbackError);
      throw fallbackError;
    }
  }
}

async function handleStartCommand(chatId: number): Promise<void> {
  const startMessage =
    `${bold("Welcome to LoomCal Bot!")}\n\n` +
    `This bot helps you manage your calendar events through the ${italic(
      "LoomCal API"
    )}.\n\n` +
    `${bold("Available Commands:")}\n` +
    `• ${inlineCode("/setup [apiKey]")} - Configure your API key\n` +
    `• ${inlineCode("/create [event_data]")} - Create new events\n` +
    `• ${inlineCode("/get [filters]")} - Get existing events\n` +
    `• ${inlineCode("/update [target] [data]")} - Update events\n` +
    `• ${inlineCode("/delete [target]")} - Delete events\n` +
    `• ${inlineCode("/help")} - Show detailed help\n\n` +
    `${bold("Quick References:")}\n` +
    `• ${inlineCode("/help flag")} - See all available flags\n` +
    `• ${inlineCode("/help operator")} - See all available operators\n\n` +
    `Need help? Type ${inlineCode("/help")} for detailed command information.`;

  await sendMessage(chatId, startMessage);
}

async function handleHelpCommand(chatId: number, text: string): Promise<void> {
  const parts = text.trim().split(/\s+/);
  const specificCommand = parts[1];

  if (specificCommand) {
    const command = specificCommand.toLowerCase();
    let helpMessage = "";

    switch (command) {
      case "setup":
        helpMessage = HELP_MESSAGES.SETUP();
        break;
      case "create":
        helpMessage = HELP_MESSAGES.CREATE();
        break;
      case "get":
        helpMessage = HELP_MESSAGES.GET();
        break;
      case "update":
        helpMessage = HELP_MESSAGES.UPDATE();
        break;
      case "delete":
        helpMessage = HELP_MESSAGES.DELETE();
        break;
      case "flag":
      case "flags":
        helpMessage = HELP_MESSAGES.FLAG();
        break;
      case "operator":
      case "operators":
        helpMessage = HELP_MESSAGES.OPERATOR();
        break;
      default:
        helpMessage =
          `${bold("Unknown command:")} ${inlineCode(specificCommand)}\n\n` +
          `${bold("Available commands:")} ${inlineCode("setup")}, ${inlineCode(
            "create"
          )}, ${inlineCode("get")}, ${inlineCode("update")}, ${inlineCode(
            "delete"
          )}, ${inlineCode("flag")}, ${inlineCode("operator")}\n\n` +
          `Type ${inlineCode("/help")} to see all available commands.`;
    }

    await sendMessage(chatId, helpMessage);
  } else {
    const generalHelp =
      `${bold("LoomCal Bot Help")}\n\n` +
      `${bold("Available Commands:")}\n` +
      `• ${inlineCode("/setup [apiKey]")} - Configure your API key\n` +
      `• ${inlineCode("/create [event_data]")} - Create new events\n` +
      `• ${inlineCode("/get [filters]")} - Get existing events\n` +
      `• ${inlineCode("/update [target] [data]")} - Update events\n` +
      `• ${inlineCode("/delete [target]")} - Delete events\n\n` +
      `${bold("Get Detailed Help:")}\n` +
      `Type ${inlineCode("/help [command]")} for specific examples:\n` +
      `• ${inlineCode("/help setup")} - Setup instructions\n` +
      `• ${inlineCode("/help create")} - Create event examples\n` +
      `• ${inlineCode("/help get")} - Query examples\n` +
      `• ${inlineCode("/help update")} - Update examples\n` +
      `• ${inlineCode("/help delete")} - Delete examples\n` +
      `• ${inlineCode("/help flag")} - Available flags\n` +
      `• ${inlineCode("/help operator")} - Available operators`;

    await sendMessage(chatId, generalHelp);
  }
}

function getErrorSuggestion(text: string): string {
  const command = text.split(" ")[0]?.toLowerCase();

  switch (command) {
    case "/setup":
      return `${bold("Setup Help:")} Use ${inlineCode(
        "/help setup"
      )} for API key configuration instructions.`;
    case "/create":
      return `${bold("Create Help:")} Use ${inlineCode(
        "/help create"
      )} for event creation format and fields.`;
    case "/get":
      return `${bold("Get Help:")} Use ${inlineCode(
        "/help get"
      )} for query format and filter options.`;
    case "/update":
      return `${bold("Update Help:")} Use ${inlineCode(
        "/help update"
      )} for update syntax and operators.`;
    case "/delete":
      return `${bold("Delete Help:")} Use ${inlineCode(
        "/help delete"
      )} for deletion syntax and targeting.`;
    default:
      return `${bold("General Help:")} Use ${inlineCode(
        "/help"
      )} to see all available commands and formats.`;
  }
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

  if (!text.startsWith("/")) {
    await sendMessage(
      chatId,
      `💬 Please use a valid command. Type ${inlineCode(
        "/help"
      )} for available commands.`
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
        await handleSetupCommand(chatId, userId, text, {
          first_name: from.first_name,
          last_name: from.last_name,
        });
        break;
      case COMMANDS.CREATE:
        const getUserConfig_create = await getUserConfig(userId, {
          first_name: from.first_name,
          last_name: from.last_name,
        });
        await handleCreateCommand(
          chatId,
          userId,
          text,
          { first_name: from.first_name, last_name: from.last_name },
          getUserConfig_create || undefined
        );
        break;
      case COMMANDS.GET:
        const getUserConfig_get = await getUserConfig(userId, {
          first_name: from.first_name,
          last_name: from.last_name,
        });
        await handleGetCommand(
          chatId,
          userId,
          text,
          { first_name: from.first_name, last_name: from.last_name },
          getUserConfig_get || undefined
        );
        break;
      case COMMANDS.UPDATE:
        const getUserConfig_update = await getUserConfig(userId, {
          first_name: from.first_name,
          last_name: from.last_name,
        });
        await handleUpdateCommand(
          chatId,
          userId,
          text,
          { first_name: from.first_name, last_name: from.last_name },
          getUserConfig_update || undefined
        );
        break;
      case COMMANDS.DELETE:
        const getUserConfig_delete = await getUserConfig(userId, {
          first_name: from.first_name,
          last_name: from.last_name,
        });
        await handleDeleteCommand(
          chatId,
          userId,
          text,
          { first_name: from.first_name, last_name: from.last_name },
          getUserConfig_delete || undefined
        );
        break;
      case "/help":
        await handleHelpCommand(chatId, text);
        break;
      default:
        await sendMessage(
          chatId,
          `${bold("Unknown command:")} ${inlineCode(command)}\n\n` +
            `${bold("Available commands:")}\n` +
            `• ${inlineCode(COMMANDS.SETUP)} - Configure bot\n` +
            `• ${inlineCode(COMMANDS.CREATE)} - Create events\n` +
            `• ${inlineCode(COMMANDS.GET)} - Get events\n` +
            `• ${inlineCode(COMMANDS.UPDATE)} - Update events\n` +
            `• ${inlineCode(COMMANDS.DELETE)} - Delete events\n` +
            `• ${inlineCode("/help")} - Show detailed help\n\n` +
            `${bold("Quick References:")}\n` +
            `• ${inlineCode("/help flag")} - Available flags\n` +
            `• ${inlineCode("/help operator")} - Available operators\n\n` +
            `Type ${inlineCode("/help [command]")} for specific command help.`
        );
    }
  } catch {
    await sendMessage(
      chatId,
      `🚨 ${bold("An error occurred")} while processing your command.\n\n` +
        `${getErrorSuggestion(text)}\n\n` +
        `Type ${inlineCode("/help")} for command usage examples.`
    );
  }
}

async function handleSetupCommand(
  chatId: number,
  userId: number,
  text: string,
  userInfo?: { first_name?: string; last_name?: string }
): Promise<void> {
  const flags = extractFlags(text);
  const sequence = extractSequence(text);

  let apiKey: string;

  if (flags[FLAGS.API]) {
    apiKey = flags[FLAGS.API] as string;
  } else if (sequence[0]) {
    apiKey = sequence[0];
  } else {
    await sendMessage(
      chatId,
      `🔑 ${bold("Missing API Key")}\n\n` +
        `${italic("Correct usage:")}\n` +
        `${inlineCode("/setup YOUR_API_KEY")}\n` +
        `${inlineCode("/setup -api YOUR_API_KEY")} (with flag)\n\n` +
        `Need help? Type ${inlineCode(
          "/help setup"
        )} for detailed instructions.`
    );
    return;
  }

  if (!validateApiKey(apiKey)) {
    await sendMessage(
      chatId,
      `🚫 ${bold("Invalid API Key Format")}\n\n` +
        `API keys should be at least 10 characters and contain only letters, numbers, underscores, and hyphens.\n\n` +
        `${italic("Example format:")} ${inlineCode("abc123_xyz789")}\n\n` +
        `Type ${inlineCode("/help setup")} for more information.`
    );
    return;
  }

  const baseUrl = (flags[FLAGS.BASE] as string) || sequence[1];
  const timeout =
    (flags[FLAGS.TIMEOUT] as number) ||
    (sequence[2] ? parseInt(sequence[2], 10) : undefined);
  const retries =
    (flags[FLAGS.RETRIES] as number) ||
    (sequence[3] ? parseInt(sequence[3], 10) : undefined);
  const debug = (flags["-debug"] as boolean) || false;

  const finalUserInfo = userInfo || {
    first_name: undefined,
    last_name: undefined,
  };

  const config = {
    apiKey,
    baseUrl,
    timeout,
    retries,
    debug,
  };

  const savedToDatabase = await saveUserConfig(userId, finalUserInfo, config);

  if (savedToDatabase) {
    await sendMessage(
      chatId,
      `${bold("Setup Complete!")}\n\n` +
        `API key configured and saved to database!\n` +
        `Configuration will persist across sessions\n\n` +
        `${bold("Configuration:")}\n` +
        `• ${bold("API Key:")} ${inlineCode(
          apiKey.substring(0, 8) + "..."
        )}\n` +
        `• ${bold("Base URL:")} ${inlineCode(baseUrl || "Default")}\n` +
        `• ${bold("Timeout:")} ${inlineCode(String(timeout || "Default"))}\n` +
        `• ${bold("Retries:")} ${inlineCode(String(retries || "Default"))}\n` +
        `• ${bold("Debug:")} ${inlineCode(
          debug ? "Enabled" : "Disabled"
        )}\n\n` +
        `${bold("Next steps:")}\n` +
        `• ${inlineCode("/create")} - Create your first event\n` +
        `• ${inlineCode("/get")} - View your events\n` +
        `• ${inlineCode("/help")} - See all available commands`
    );
  } else {
    userConfigs.set(userId, config);
    await sendMessage(
      chatId,
      `${bold("Setup Incomplete!")}\n\n` +
        `API key wasn't configured (stored temporarily)\n` +
        `${italic(
          "Note: Make sure your API Key and BaseUrl are correct"
        )}\n\n` +
        `${bold("Configuration:")}\n` +
        `• ${bold("API Key:")} ${inlineCode(
          apiKey.substring(0, 8) + "..."
        )}\n` +
        `• ${bold("Base URL:")} ${inlineCode(baseUrl || "Default")}\n` +
        `• ${bold("Timeout:")} ${inlineCode(String(timeout || "Default"))}\n` +
        `• ${bold("Retries:")} ${inlineCode(String(retries || "Default"))}\n` +
        `• ${bold("Debug:")} ${inlineCode(
          debug ? "Enabled" : "Disabled"
        )}\n\n` +
        `${bold("Next steps:")}\n` +
        `• ${inlineCode("/help setup")} - View setup instructions\n` +
        `• ${inlineCode("/help")} - See all available commands`
    );
  }
}

export function parseUnifiedEventData(
  text: string,
  commandType: "GET" | "CREATE" | "UPDATE" | "DELETE"
): {
  query: Record<string, unknown>;
  options?: ParsedOptions;
} {
  const cleanText = text.replace(/^\/\w+\s*/, "").trim();
  const segments = splitByFlags(cleanText);
  const query: Record<string, unknown> = {};
  let options: ParsedOptions | undefined;
  let filter: Record<string, unknown> | undefined;

  let sequenceIndex = 0;
  const sequenceFields = SEQUENCES[commandType];

  console.log("🔍 Starting parsing with sequenceFields:", sequenceFields);

  for (const segment of segments) {
    console.log(
      "🔍 Processing segment:",
      segment.type,
      "sequenceIndex:",
      sequenceIndex,
      "content:",
      segment.content
    );

    if (segment.type === "sequential") {
      const values = parseSequentialValues(segment.content);

      for (const value of values) {
        if (sequenceIndex < sequenceFields.length) {
          const fieldName = sequenceFields[sequenceIndex];

          if (fieldName === "options") {
            if (value.startsWith("{") && value.endsWith("}")) {
              try {
                const parsed = parseValue(value);
                if (typeof parsed === "object" && parsed !== null) {
                  options = parsed as ParsedOptions;
                }
              } catch {
                // Silent error handling for options parsing
              }
            }
            sequenceIndex++;
            continue;
          }

          if (fieldName === "filter") {
            if (value.startsWith("{") && value.endsWith("}")) {
              try {
                const parsed = parseValue(value);
                if (typeof parsed === "object" && parsed !== null) {
                  filter = parsed as Record<string, unknown>;
                }
              } catch {
                // Silent error handling for filter parsing
              }
            }
            sequenceIndex++;
            continue;
          }

          if (fieldName === "startTime" || fieldName === "endTime") {
            const processedValue = processTimeValue(value, fieldName, true);
            if (processedValue !== null) {
              if (
                typeof processedValue === "object" &&
                processedValue !== null &&
                "operator" in processedValue &&
                processedValue.operator
              ) {
                Object.assign(
                  query,
                  (
                    processedValue as {
                      operator: true;
                      query: Record<string, unknown>;
                    }
                  ).query
                );
              } else {
                query[fieldName] = processedValue;
              }
            }
          } else {
            const processedValue = processValue(value, fieldName);

            if (fieldName === "customData" && value.includes("} {")) {
              const separated = separateCombinedJSONObjects(value);

              if (separated.length >= 2) {
                const secondObj = separated[1];
                if (secondObj.startsWith("{") && secondObj.endsWith("}")) {
                  try {
                    const parsed = parseValue(secondObj);
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

                      const hasValidOptionKey = Object.keys(objData).some(
                        (key) => validOptionKeys.includes(key)
                      );

                      if (hasValidOptionKey) {
                        options = objData as ParsedOptions;
                      }
                    }
                  } catch {
                    // Silent error handling for combined object options parsing
                  }
                }
              }
            }

            if (processedValue !== null) {
              if (
                typeof processedValue === "object" &&
                processedValue !== null &&
                "operator" in processedValue &&
                processedValue.operator
              ) {
                Object.assign(
                  query,
                  (
                    processedValue as {
                      operator: true;
                      query: Record<string, unknown>;
                    }
                  ).query
                );
              } else {
                query[fieldName] = processedValue;
              }
            }
          }
          sequenceIndex++;
        } else {
          sequenceIndex++;
        }
      }
    } else if (segment.type === "flag") {
      const fieldName = mapFlagToFieldName(segment.flag || "");

      if (segment.flag === "-o") {
        options = parseValue(segment.content) as ParsedOptions;
      } else if (segment.flag === "-f") {
        if (segment.content.startsWith("{") && segment.content.endsWith("}")) {
          try {
            const parsed = parseValue(segment.content);
            if (typeof parsed === "object" && parsed !== null) {
              filter = parsed as Record<string, unknown>;
            }
          } catch {
            // Silent error handling for filter flag parsing
          }
        }
      } else if (segment.flag === "-rt" || segment.flag === "-at") {
        const timeResult = parseTimeFlags(
          segment.content,
          segment.flag === "-rt"
        );

        if (timeResult.query) {
          Object.assign(query, timeResult.query);
        }

        if (timeResult.startTime) {
          query.startTime = timeResult.startTime;
        }

        if (timeResult.endTime) {
          query.endTime = timeResult.endTime;
        }

        if (commandType === "CREATE") {
          if (timeResult.startTime && timeResult.endTime) {
            const oldIndex = sequenceIndex;
            sequenceIndex = Math.max(sequenceIndex, 4);
            console.log(
              "🔍 Updated sequenceIndex after -rt flag:",
              oldIndex,
              "→",
              sequenceIndex
            );
          } else if (timeResult.startTime) {
            const oldIndex = sequenceIndex;
            sequenceIndex = Math.max(sequenceIndex, 3);
            console.log(
              "🔍 Updated sequenceIndex after -rt startTime:",
              oldIndex,
              "→",
              sequenceIndex
            );
          } else if (timeResult.endTime) {
            const oldIndex = sequenceIndex;
            sequenceIndex = Math.max(sequenceIndex, 4);
            console.log(
              "🔍 Updated sequenceIndex after -rt endTime:",
              oldIndex,
              "→",
              sequenceIndex
            );
          }
        } else if (commandType === "GET") {
          if (timeResult.startTime && timeResult.endTime) {
            sequenceIndex = Math.max(sequenceIndex, 4);
          } else if (timeResult.startTime) {
            sequenceIndex = Math.max(sequenceIndex, 3);
          } else if (timeResult.endTime) {
            sequenceIndex = Math.max(sequenceIndex, 4);
          }
        }

        const allValues = parseSequentialValues(segment.content);
        const remainingValues = allValues.slice(2); 

        console.log("🔍 Remaining values after time parsing:", remainingValues);

        for (const value of remainingValues) {
          if (sequenceIndex < sequenceFields.length) {
            const fieldName = sequenceFields[sequenceIndex];
            console.log(
              "🔍 Processing remaining value:",
              value,
              "for field:",
              fieldName,
              "at index:",
              sequenceIndex
            );

            if (fieldName === "options") {
              if (value.startsWith("{") && value.endsWith("}")) {
                try {
                  const parsed = parseValue(value);
                  if (typeof parsed === "object" && parsed !== null) {
                    options = parsed as ParsedOptions;
                  }
                } catch {
                  // Silent error handling for options parsing
                }
              }
              sequenceIndex++;
              continue;
            }

            if (fieldName === "filter") {
              if (value.startsWith("{") && value.endsWith("}")) {
                try {
                  const parsed = parseValue(value);
                  if (typeof parsed === "object" && parsed !== null) {
                    filter = parsed as Record<string, unknown>;
                  }
                } catch {
                  // Silent error handling for filter parsing
                }
              }
              sequenceIndex++;
              continue;
            }

            const processedValue = processValue(value, fieldName);

            if (fieldName === "customData" && value.includes("} {")) {
              const separated = separateCombinedJSONObjects(value);

              if (separated.length >= 2) {
                const secondObj = separated[1];
                if (secondObj.startsWith("{") && secondObj.endsWith("}")) {
                  try {
                    const parsed = parseValue(secondObj);
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

                      const hasValidOptionKey = Object.keys(objData).some(
                        (key) => validOptionKeys.includes(key)
                      );

                      if (hasValidOptionKey) {
                        options = objData as ParsedOptions;
                      }
                    }
                  } catch {
                    // Silent error handling for combined object options parsing
                  }
                }
              }
            }

            if (processedValue !== null) {
              if (
                typeof processedValue === "object" &&
                processedValue !== null &&
                "operator" in processedValue &&
                processedValue.operator
              ) {
                Object.assign(
                  query,
                  (
                    processedValue as {
                      operator: true;
                      query: Record<string, unknown>;
                    }
                  ).query
                );
              } else {
                query[fieldName] = processedValue;
                console.log("🔍 Set field:", fieldName, "=", processedValue);
              }
            }
            sequenceIndex++;
          } else {
            sequenceIndex++;
          }
        }
      } else if (fieldName) {
        if (fieldName !== "filter") {
          let processedValue;

          if (fieldName === "startTime" || fieldName === "endTime") {
            const isRelative = segment.flag !== "-at";
            processedValue = processTimeValue(
              segment.content,
              fieldName,
              isRelative
            );
          } else {
            processedValue = processValue(segment.content, fieldName);
          }

          if (processedValue !== null) {
            if (
              typeof processedValue === "object" &&
              processedValue !== null &&
              "operator" in processedValue &&
              processedValue.operator
            ) {
              Object.assign(
                query,
                (
                  processedValue as {
                    operator: true;
                    query: Record<string, unknown>;
                  }
                ).query
              );
            } else {
              query[fieldName] = processedValue;
            }
          }
        }
      }
    }
  }

  let finalQuery = query;
  if (
    filter &&
    (commandType === "GET" ||
      commandType === "UPDATE" ||
      commandType === "DELETE")
  ) {
    if (Object.keys(query).length > 0) {
      finalQuery = {
        $and: [query, filter],
      };
    } else {
      finalQuery = { ...filter };
    }
  }

  return { query: finalQuery, options };
}

function processValue(
  value: string,
  fieldName: string
): unknown | { operator: true; query: Record<string, unknown> } | null {
  const operatorMatch = value.match(/^\$(\w+)\((.+)\)$/);
  if (operatorMatch) {
    const [, operatorName, argsStr] = operatorMatch;
    const fullOperator = `$${operatorName}`;

    if (
      !Object.values(OPERATORS).includes(
        fullOperator as (typeof OPERATORS)[keyof typeof OPERATORS]
      )
    ) {
      return null;
    }

    const args = parseOperatorArgs(argsStr);
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

  if (
    (fieldName === "customData" ||
      fieldName === "options" ||
      fieldName === "filter") &&
    typeof parsedValue === "string" &&
    parsedValue.startsWith("{") &&
    parsedValue.endsWith("}")
  ) {
    try {
      parsedValue = parseCriticalObject(parsedValue as string);
    } catch {
      // Silent error handling for object parsing
    }
  }

  if (
    (fieldName === "startTime" || fieldName === "endTime") &&
    typeof parsedValue === "number"
  ) {
    parsedValue = convertRelativeTime(parsedValue);
  }

  return parsedValue;
}

export function formatEventsResponse(
  events: Record<string, unknown>[]
): string {
  if (!events || events.length === 0) {
    return `${bold("No events found")}`;
  }

  const formattedEvents = events.slice(0, 10).map((event, index) => {
    const parts: string[] = [];

    const title = event.title || "Untitled Event";
    parts.push(
      `${bold(String(index + 1))}. ${bold(escapeMarkdown(title as string))}`
    );

    if (event.description) {
      parts.push(
        `   ${bold("Description:")} ${escapeMarkdown(
          event.description as string
        )}`
      );
    }

    if (event.type) {
      parts.push(`   ${bold("Type:")} ${event.type as string}`);
    }

    if (event.startTime) {
      const startTime = new Date(event.startTime as string).toLocaleString();
      parts.push(`   ${bold("Start:")} ${startTime}`);
    }

    if (event.endTime) {
      const endTime = new Date(event.endTime as string).toLocaleString();
      parts.push(`   ${bold("End:")} ${endTime}`);
    }

    if (event.repeat !== null && event.repeat !== undefined) {
      parts.push(`   ${bold("Repeat:")} ${String(event.repeat)}`);
    }

    if (event.color) {
      parts.push(`   ${bold("Color:")} ${event.color as string}`);
    }

    if (event.resource) {
      parts.push(
        `   ${bold("Resource:")} ${link("Link", event.resource as string)}`
      );
    }

    if (event.customData && typeof event.customData === "object") {
      const customData = event.customData as Record<string, unknown>;
      const customKeys = Object.keys(customData);
      if (customKeys.length > 0) {
        const formattedJson = JSON.stringify(customData, null, 2);
        parts.push(
          `   ${bold("Custom:")}\n${codeBlock(formattedJson, "json")}`
        );
      }
    }

    if (event.id) {
      parts.push(`   ${bold("ID:")} ${String(event.id)}`);
    }

    return parts.join("\n");
  });

  const header = `${bold(`Found ${events.length} event(s):`)}

`;
  const message = header + formattedEvents.join("\n\n");

  if (events.length > 10) {
    return (
      message + `\n\n${italic(`...  and ${events.length - 10} more events`)}`
    );
  }

  return message;
}
