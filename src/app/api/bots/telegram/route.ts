import { NextRequest, NextResponse } from "next/server";
import { handleMessage, TelegramMessage } from "./_controller/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TelegramMessage;
    console.log("POST /api/bots/telegram", body);

    if (body.message && body.message.text) {
      await handleMessage(body.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error handling Telegram webhook:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  console.log(
    "GET /api/bots/telegram",
    Object.fromEntries(searchParams.entries())
  );

  return NextResponse.json({
    ok: true,
    query: Object.fromEntries(searchParams.entries()),
    status: "Telegram bot is running",
  });
}
