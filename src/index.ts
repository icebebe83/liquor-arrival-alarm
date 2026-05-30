import {
  DATA_FILE,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET,
  SUPABASE_STORAGE_OBJECT,
  SUPABASE_URL,
  WATCH_SOURCES
} from "./config.ts";
import { collectShopifySource } from "./shopify.ts";
import { loadStoredProducts, saveStoredProducts } from "./storage.ts";
import { sendCategoryNotifications } from "./telegram.ts";
import type { Product } from "./types.ts";

const dryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";
const baseline = process.argv.includes("--baseline");

async function main(): Promise<void> {
  const storageConfig = {
    dataFile: DATA_FILE,
    supabaseUrl: SUPABASE_URL,
    supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    supabaseStorageBucket: SUPABASE_STORAGE_BUCKET,
    supabaseStorageObject: SUPABASE_STORAGE_OBJECT
  };
  const previousProducts = await loadStoredProducts(storageConfig);
  const allCurrentProducts: Product[] = [];
  const newProductsByCategory = new Map<string, Product[]>();
  const failures: string[] = [];

  for (const source of WATCH_SOURCES) {
    console.log(`Collecting ${source.name}...`);
    try {
      const products = await collectShopifySource(source);
      allCurrentProducts.push(...products);

      const newProducts = products.filter((product) => !hasSeenProduct(product, previousProducts));
      newProductsByCategory.set(source.name, newProducts);
      console.log(`${source.name}: ${products.length} products, ${newProducts.length} new`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      newProductsByCategory.set(source.name, []);
      console.error(`${source.name}: failed - ${message}`);
    }
  }

  if (allCurrentProducts.length === 0 && failures.length > 0) {
    throw new Error(`All categories failed:\n${failures.join("\n")}`);
  }

  const newCount = [...newProductsByCategory.values()].reduce((sum, products) => sum + products.length, 0);

  if (baseline) {
    await saveStoredProducts(storageConfig, mergeProducts(previousProducts, allCurrentProducts));
    console.log(`Baseline saved: ${allCurrentProducts.length} products. Telegram message was not sent.`);
    return;
  }

  if (dryRun) {
    if (newCount === 0) {
      console.log("No new products.");
      return;
    }

    console.log(`Dry run: ${newCount} new products found. Telegram message was not sent.`);
    for (const [sourceName, products] of newProductsByCategory) {
      for (const product of products) {
        console.log(`[${sourceName}] ${product.name} ${product.price ?? ""} ${product.available === false ? "sold out" : "available"} ${product.url}`);
      }
    }
    return;
  }

  if (newCount === 0) {
    await saveStoredProducts(storageConfig, mergeProducts(previousProducts, allCurrentProducts));
    console.log("No new products.");
    return;
  }

  await saveStoredProducts(storageConfig, mergeProducts(previousProducts, allCurrentProducts));
  await sendCategoryNotifications(newProductsByCategory);
  console.log(`Sent Telegram notifications for ${newCount} new products.`);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

function mergeProducts(previousProducts: Product[], currentProducts: Product[]): Product[] {
  const merged: Product[] = [];

  for (const product of [...previousProducts, ...currentProducts]) {
    const existingIndex = merged.findIndex((existing) => productsMatch(product, existing));
    if (existingIndex >= 0) {
      merged[existingIndex] = product;
    } else {
      merged.push(product);
    }
  }

  return merged.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

function hasSeenProduct(product: Product, previousProducts: Product[]): boolean {
  return previousProducts.some((previous) => productsMatch(product, previous));
}

function productsMatch(a: Product, b: Product): boolean {
  const sameId = Boolean(a.id && b.id && a.id === b.id);
  const sameUrl = normalizeForCompare(a.url) === normalizeForCompare(b.url);
  return sameId || sameUrl;
}

function normalizeForCompare(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return url;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
