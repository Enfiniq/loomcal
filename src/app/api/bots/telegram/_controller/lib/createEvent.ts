import { LoomCal } from "@/sdk";
import {
  normalizeOptions,
  toCreateOptions,
} from "@/app/api/bots/telegram/_controller/lib/helpers";
import { extractOptions } from "@/app/api/bots/telegram/_controller/lib/helpers";
import {
  UserConfig,
  UserInfo,
  ParsedOptions,
} from "@/app/api/bots/telegram/_controller/lib/types";
import { parseUnifiedEventData } from "@/app/api/bots/telegram/_controller/lib/telegram";
import {
  bold,
  inlineCode,
  codeBlock,
  italic,
} from "@/app/api/bots/telegram/_controller/lib/telegram";
import { sendMessage } from "@/app/api/bots/telegram/_controller/lib/telegram";

export async function handleCreateCommand(
  chatId: number,
  userId: number,
  text: string,
  userInfo?: UserInfo,
  config?: UserConfig
): Promise<void> {
  // Check if user configuration is available
  if (!config) {
    await sendMessage(
      chatId,
      `${bold("Not Configured")}\n\n` +
        `Please setup your API key first:\n` +
        `${codeBlock("/setup YOUR_API_KEY")}\n` +
        `Need help? Type ${inlineCode(
          "/help setup"
        )} for detailed instructions\\.`
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
          title: (eventData.title as string) || "Unknown Event",
          description: eventData.description as string,
          startTime: eventData.startTime as string,
          endTime: eventData.endTime as string,
          type: eventData.type as string,
          repeat: eventData.repeat as string,
          color: eventData.color as string,
          resource: eventData.resource as string,
          customData: eventData.customData as Record<string, unknown>,
          user: {
            identifier: `${userInfo?.first_name || "Unknown"}-${userId}`,
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
        `${bold("Event Created Successfully!")}\n\n` +
          `Your event has been created and scheduled\\.\n\n` +
          `\\#\\#\\# Next steps:\n` +
          `• ${inlineCode("/get")} \\- View your events\n` +
          `• ${inlineCode("/update")} \\- Modify event details\n` +
          `• ${inlineCode("/help")} \\- See all available commands`
      );
    } else {
      await sendMessage(
        chatId,
        `${bold("Failed to Create Event")}\n\n` +
          `${italic("Please check:")}\n` +
          `• Required fields are provided\n` +
          `• Date/time format is correct\n` +
          `• JSON syntax is valid\n\n` +
          `Need help? Type ${inlineCode("/help create")} for examples\\.`
      );
    }
  } catch (error) {
    console.error("Error creating event:", error);

    const errorMessage = getCreateErrorMessage(error, text);
    await sendMessage(chatId, errorMessage);
  }
}

export function parseCreateEventData(text: string): {
  event: Record<string, unknown>;
  options: ParsedOptions;
} {
  const result = parseUnifiedEventData(text, "CREATE");

  const extractedOptions = extractOptions(text);
  const normalizedOptions = normalizeOptions(extractedOptions);

  return {
    event: result.query,
    options: result.options || normalizedOptions,
  };
}

function getCreateErrorMessage(error: unknown, text: string): string {
  const isParsingError = text.includes("{") && !text.includes("}");
  const isMissingFields =
    !text.includes("title") || !text.includes("startTime");

  if (isParsingError) {
    return (
      `🚫 ${bold("JSON Parsing Error")}\n\n` +
      `${italic("Common issues:")}\n` +
      `• Missing closing braces ${inlineCode("}")}\n` +
      `• Unescaped quotes in strings\n` +
      `• Missing commas between fields\n\n` +
      `Type ${inlineCode("/help create")} for format examples\\.`
    );
  }

  if (isMissingFields) {
    return (
      `${bold("Missing Required Fields")}\n\n` +
      `${italic("Required fields:")}\n` +
      `• ${inlineCode("title")} \\- Event name\n` +
      `• ${inlineCode("startTime")} \\- ISO date string\n\n` +
      `Type ${inlineCode("/help create")} for detailed format\\.`
    );
  }

  const errorString = error instanceof Error ? error.message : String(error);
  const isNetworkError =
    errorString.includes("network") || errorString.includes("timeout");

  if (isNetworkError) {
    return (
      `🌐 ${bold("Connection Error")}\n\n` +
      `Unable to reach the LoomCal API\\.\n\n` +
      `${italic("Please try:")}\n` +
      `• Check your internet connection\n` +
      `• Verify API key is still valid\n` +
      `• Try again in a few moments\n\n` +
      `Type ${inlineCode("/help create")} if you need assistance\\.`
    );
  }

  return (
    `${bold("Event Creation Failed")}\n\n` +
    `${italic("Please check:")}\n` +
    `• All required fields are provided\n` +
    `• Date/time format is correct \\(ISO 8601\\)\n` +
    `• JSON syntax is valid\n` +
    `• API key has proper permissions\n\n` +
    `Need help? Type ${inlineCode(
      "/help create"
    )} for format and troubleshooting\\.`
  );
}
