import { LoomCal } from "@/sdk";
import { toOperationOptions } from "@/app/api/bots/telegram/_controller/lib/helpers";
import {
  UserConfig,
  UserInfo,
  ParsedEventData,
} from "@/app/api/bots/telegram/_controller/lib/types";
import { ERROR_MESSAGES } from "@/app/api/bots/telegram/_controller/lib/constants";
import {
  parseUnifiedEventData,
  formatEventsResponse,
} from "@/app/api/bots/telegram/_controller/lib/telegram";
import {
  bold,
  inlineCode,
  italic,
  sendMessage,
} from "@/app/api/bots/telegram/_controller/lib/telegram";

export async function handleGetCommand(
  chatId: number,
  userId: number,
  text: string,
  userInfo?: UserInfo,
  config?: UserConfig
): Promise<void> {
  // Check if user configuration is available
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

    console.log("Database Operation Prepared:", {
      commandType: "GET",
      query: queryData.target,
      options: queryData.options,
      inputText: text,
    });

    const result = await loomCalClient
      .getEvents({
        target: queryData.target,
        options: toOperationOptions(queryData.options),
      })
      .execute();

    if (result.success) {
      const events = result.operations[0]?.result?.results?.[0]?.data || [];

      if (events.length === 0) {
        await sendMessage(
          chatId,
          `${bold("No Events Found")}\n\n` +
            `No events match your search criteria.\n\n` +
            `${bold("Try:")}\n` +
            `• ${inlineCode("/get")} - View all events\n` +
            `• ${inlineCode("/get -t meeting")} - Search by title\n` +
            `• ${inlineCode("/help get")} - See more examples`
        );
      } else {
        const formattedMessage = formatEventsResponse(events);
        await sendMessage(chatId, formattedMessage);
      }
    } else {
      await sendMessage(
        chatId,
        `${bold(
          "Failed to get events"
        )}. Please check your filters and try again.`
      );
    }
  } catch (error) {
    await sendMessage(
      chatId,
      `${bold("Get Error")}\n\n` +
        `${italic("Error:")} ${
          error instanceof Error ? error.message : "Unknown error"
        }\n\n` +
        `Type ${inlineCode("/help get")} for proper syntax and examples.`
    );
  }
}

export function parseGetEventData(text: string): ParsedEventData {
  const cleanText = text.replace(/^\/\w+\s*/, "").trim();

  if (!cleanText) {
    return {
      target: {},
      options: {},
    };
  }

  const result = parseUnifiedEventData(text, "GET");

  return {
    target: result.query,
    options: result.options || {},
  };
}
