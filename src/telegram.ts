import type { Product } from "./types.ts";
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "./config.ts";

export async function sendCategoryNotifications(productsByCategory: Map<string, Product[]>): Promise<void> {
  const token = TELEGRAM_BOT_TOKEN;
  const chatId = TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required");
  }

  for (const [category, products] of productsByCategory) {
    if (products.length === 0) {
      continue;
    }

    await sendTelegramMessage(token, chatId, formatCategoryMessage(category, products));
  }
}

export function formatCategoryMessage(category: string, products: Product[]): string {
  const blocks = products.map((product) => [
    `상품명: ${product.name}`,
    `가격: ${product.price ?? "-"}`,
    `상태: ${product.available === false ? "Sold out" : "Available"}`,
    `링크: ${product.url}`
  ].join("\n"));

  return [`🥃 New ${category} Arrival`, ...blocks].join("\n\n");
}

async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      disable_web_page_preview: true,
      text
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram send failed: ${response.status} ${body}`);
  }
}
