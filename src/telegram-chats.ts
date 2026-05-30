import { TELEGRAM_BOT_TOKEN } from "./config.ts";

type TelegramUpdate = {
  message?: {
    chat?: {
      id: number;
      title?: string;
      username?: string;
      type?: string;
    };
    text?: string;
    date?: number;
  };
};

async function main(): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
  if (!response.ok) {
    throw new Error(`Telegram getUpdates failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json() as { result?: TelegramUpdate[] };
  const chats = new Map<number, NonNullable<TelegramUpdate["message"]>["chat"]>();

  for (const update of payload.result ?? []) {
    const chat = update.message?.chat;
    if (chat?.id) {
      chats.set(chat.id, chat);
    }
  }

  if (chats.size === 0) {
    console.log("No chats found. Add the bot to the new chat, send a message there, then run this again.");
    return;
  }

  for (const chat of chats.values()) {
    console.log([
      `id=${chat?.id}`,
      `type=${chat?.type ?? "-"}`,
      `title=${chat?.title ?? chat?.username ?? "-"}`
    ].join(" "));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
