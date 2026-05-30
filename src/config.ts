import { existsSync, readFileSync } from "node:fs";
import type { WatchSource } from "./types.ts";

loadDotEnv();

export const WATCH_SOURCES: WatchSource[] = [
  {
    name: "Cypress Craft",
    productsJsonUrl: "https://www.cypresscraft.com/collections/new-arrivals/products.json?limit=250",
    productBaseUrl: "https://www.cypresscraft.com/products/"
  },
  {
    name: "Hi Proof",
    productsJsonUrl: "https://www.hiproof.com/collections/new-arrivals/products.json?limit=250",
    productBaseUrl: "https://www.hiproof.com/products/"
  }
];

export const DATA_FILE = process.env.DATA_FILE ?? "data/products.json";
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "liquor-alarm";
export const SUPABASE_STORAGE_OBJECT = process.env.SUPABASE_STORAGE_OBJECT ?? "products.json";

function loadDotEnv(): void {
  const envPath = ".env";
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}
