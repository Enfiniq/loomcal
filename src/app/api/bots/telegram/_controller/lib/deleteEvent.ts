import { LoomCal } from "@/sdk";
import {
  ParsedDeleteData,
  UserConfig,
  UserInfo,
} from "@/app/api/bots/telegram/_controller/lib/types";
// import { FLAGS } from "@/app/api/bots/telegram/_controller/lib/constants";
import { parseUnifiedEventData } from "@/app/api/bots/telegram/_controller/lib/telegram";
import { toOperationOptions } from "@/app/api/bots/telegram/_controller/lib/helpers";
import {
  bold,
  inlineCode,
  italic,
  sendMessage,
} from "@/app/api/bots/telegram/_controller/lib/telegram";

export async function handleDeleteCommand(
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
        `${inlineCode("/setup YOUR_API_KEY")}\n` +
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

    const deleteData = parseDeleteEventData(text);

    if ("error" in deleteData) {
      await sendMessage(
        chatId,
        `${bold("Delete Command Error")}\n\n` +
          `${deleteData.error}\\.\n\n` +
          `${italic("Example:")} ${inlineCode('/delete -t "Meeting"')}\n\n` +
          `Type ${inlineCode("/help delete")} for more examples\\.`
      );
      return;
    }

    if (!deleteData.target || Object.keys(deleteData.target).length === 0) {
      await sendMessage(
        chatId,
        `${bold("Missing Selection Criteria")}\n\n` +
          `Delete command requires selection criteria\\. Use flags like ${inlineCode(
            "-t"
          )}, ${inlineCode("-d")} to specify which events to delete\\.\n\n` +
          `${italic("Example:")} ${inlineCode('/delete -t "Meeting"')}\n\n` +
          `Type ${inlineCode("/help delete")} for more examples\\.`
      );
      return;
    }

    console.log("Database Operation Prepared:", {
      commandType: "DELETE",
      query: deleteData.target,
      options: deleteData.options,
      inputText: text,
    });

    const result = await loomCalClient
      .deleteEvents({
        target: deleteData.target,
        options: deleteData.options
          ? toOperationOptions(deleteData.options)
          : undefined,
      })
      .execute();

    if (result.success) {
      const operations = result.operations || [];
      const deletedCount = operations.reduce(
        (count, op) => count + (op.result?.deletedCount || 0),
        0
      );

      await sendMessage(
        chatId,
        `${bold("🗑️ Event Deleted Successfully!")}\n\n` +
          `${deletedCount} event\\(s\\) were deleted\\.\n\n` +
          `\\#\\#\\# Next steps:\n` +
          `• ${inlineCode("/get")} \\- View your remaining events\n` +
          `• ${inlineCode("/help")} \\- See all available commands`
      );
    } else {
      await sendMessage(
        chatId,
        `${bold("Failed to Delete Event")}\n\n` +
          `${italic("Please check:")}\n` +
          `• Selection criteria matches existing events\n` +
          `• Query format is correct\n` +
          `• JSON syntax is valid\n\n` +
          `Need help? Type ${inlineCode("/help delete")} for examples\\.`
      );
    }
  } catch (error) {
    await sendMessage(
      chatId,
      `${bold("Delete Error")}\n\n` +
        `${italic("Error:")} ${
          error instanceof Error ? error.message : "Unknown error"
        }\n\n` +
        `Type ${inlineCode("/help delete")} for proper syntax and examples\\.`
    );
  }
}

export function parseDeleteEventData(
  text: string
): ParsedDeleteData | { error: string } {
  const cleanText = text.replace(/^\/\w+\s*/, "").trim();
  if (!cleanText) {
    return { error: "Delete command requires selection criteria" };
  }

  const result = parseUnifiedEventData(text, "GET");

  return {
    target: result.query,
    options: result.options || {},
  };
}
