import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN environment variable is not set" },
        { status: 500 }
      );
    }

    if (!process.env.BOT_URL) {
      return NextResponse.json(
        { error: "BOT_URL environment variable is not set" },
        { status: 500 }
      );
    }

    const webhookUrl = `${process.env.BOT_URL}/api/bots/telegram`;

    const telegramApiUrl = `https://api.telegram.org/bot${
      process.env.TELEGRAM_BOT_TOKEN
    }/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

    const response = await fetch(telegramApiUrl, {
      method: "GET",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to set webhook:", data);
      return NextResponse.json(
        {
          error: "Failed to set webhook",
          details: data,
          webhookUrl: webhookUrl,
        },
        { status: response.status }
      );
    }

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: "Webhook registered successfully",
        webhookUrl: webhookUrl,
        telegramResponse: data,
      });
    } else {
      return NextResponse.json(
        {
          error: "Telegram API returned error",
          details: data,
          webhookUrl: webhookUrl,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error registering webhook:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
