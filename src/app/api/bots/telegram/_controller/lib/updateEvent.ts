import { LoomCal } from "@/sdk";
import {
  ParsedUpdateData,
  UserConfig,
  UserInfo,
} from "@/app/api/bots/telegram/_controller/lib/types";
import { FLAGS } from "@/app/api/bots/telegram/_controller/lib/constants";
import { parseUnifiedEventData, sendMessage } from "@/app/api/bots/telegram/_controller/lib/telegram";
import { toOperationOptions } from "@/app/api/bots/telegram/_controller/lib/helpers";
import {
  bold,
  inlineCode,
  italic,

} from "@/app/api/bots/telegram/_controller/lib/formatting";

export async function handleUpdateCommand(
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
        )} for detailed instructions.`
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

    const updateData = parseUpdateEventData(text);

    if ("error" in updateData) {
      await sendMessage(
        chatId,
        `${bold("Update Command Error")}\n\n` +
          `${updateData.error}.\n\n` +
          `${italic("Example:")} ${inlineCode(
            '/update -t "Meeting" -to -t "Updated Meeting"'
          )}\n\n` +
          `Type ${inlineCode("/help update")} for more examples.`
      );
      return;
    }

    if (!updateData.target || Object.keys(updateData.target).length === 0) {
      await sendMessage(
        chatId,
        `${bold("Missing Selection Criteria")}\n\n` +
          `Update command requires selection criteria. Use flags like ${inlineCode(
            "-t"
          )}, ${inlineCode("-d")} to specify which events to update.\n\n` +
          `${italic("Example:")} ${inlineCode(
            '/update -t "Meeting" -to -t "Updated Meeting"'
          )}\n\n` +
          `Type ${inlineCode("/help update")} for more examples.`
      );
      return;
    }

    if (!updateData.updates || Object.keys(updateData.updates).length === 0) {
      await sendMessage(
        chatId,
        `${bold("Missing Update Data")}\n\n` +
          `Update command requires ${inlineCode(
            "-to"
          )} flag with update data\\.\n\n` +
          `${italic("Example:")} ${inlineCode(
            '/update -t "Meeting" -to -repeat 7'
          )}\n\n` +
          `Type ${inlineCode("/help update")} for more examples.`
      );
      return;
    }

    console.log("Database Operation Prepared:", {
      commandType: "UPDATE",
      query: updateData.target,
      updates: updateData.updates,
      options: updateData.options
        ? toOperationOptions(updateData.options)
        : undefined,
      inputText: text,
    });

    const result = await loomCalClient
      .updateEvents({
        target: updateData.target,
        updates: updateData.updates,
        options: updateData.options
          ? toOperationOptions(updateData.options)
          : undefined,
      })
      .execute();

    if (result.success) {
      await sendMessage(
        chatId,
        `${bold("Event Updated Successfully!")}\n\n` +
          `${bold("### Next steps:")}\n` +
          `• ${inlineCode("/get")} - View your updated events\n` +
          `• ${inlineCode("/help")} - See all available commands`
      );
    } else {
      await sendMessage(
        chatId,
        `${bold("Failed to Update Event")}\n\n` +
          `${italic("Please check:")}\n` +
          `• Selection criteria matches existing events\n` +
          `• Update data format is correct\n` +
          `• JSON syntax is valid\n\n` +
          `Need help? Type ${inlineCode("/help update")} for examples.`
      );
    }
  } catch (error) {
    await sendMessage(
      chatId,
      `${bold("Update Error")}\n\n` +
        `${italic("Error:")} ${
          error instanceof Error ? error.message : "Unknown error"
        }\n\n` +
        `Type ${inlineCode("/help update")} for proper syntax and examples.`
    );
  }
}

export function parseUpdateEventData(
  text: string
): ParsedUpdateData | { error: string } {
  const cleanText = text.replace(/^\/\w+\s*/, "").trim();
  if (!cleanText) {
    return { error: "Missing -to flag to specify updates" };
  }

  const parts = text.split(FLAGS.TO);
  if (parts.length !== 2) {
    return { error: "Update command requires exactly one -to flag" };
  }

  const [selectionPart, updatesPart] = parts;

  const selectionText = selectionPart.replace(/^\/\w+\s*/, "").trim();

  const selectionResult = parseUnifiedEventData(`/get ${selectionText}`, "GET");

  const updatesResult = parseUnifiedEventData(
    `/create ${updatesPart.trim()}`,
    "CREATE"
  );

  return {
    target: selectionResult.query,
    updates: updatesResult.query,
    options: selectionResult.options || updatesResult.options || {},
  };
}
