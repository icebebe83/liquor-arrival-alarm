import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Product, StoredData } from "./types.ts";

type StorageConfig = {
  dataFile: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseStorageBucket: string;
  supabaseStorageObject: string;
};

export async function loadStoredProducts(config: StorageConfig): Promise<Product[]> {
  if (isSupabaseStorageConfigured(config)) {
    return loadProductsFromSupabase(config);
  }

  return loadProducts(config.dataFile);
}

export async function saveStoredProducts(config: StorageConfig, products: Product[]): Promise<void> {
  if (isSupabaseStorageConfigured(config)) {
    await saveProductsToSupabase(config, products);
    return;
  }

  await saveProducts(config.dataFile, products);
}

export async function loadProducts(filePath: string): Promise<Product[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredData> | Product[];
    return Array.isArray(parsed) ? parsed : parsed.products ?? [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function saveProducts(filePath: string, products: Product[]): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const payload: StoredData = {
    updatedAt: new Date().toISOString(),
    products
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function productKey(product: Pick<Product, "id" | "url">): string {
  return product.id ? `id:${product.id}` : `url:${normalizeProductUrl(product.url)}`;
}

export function normalizeProductUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.searchParams.sort();
  return parsed.toString();
}

function isSupabaseStorageConfigured(config: StorageConfig): boolean {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}

async function loadProductsFromSupabase(config: StorageConfig): Promise<Product[]> {
  const response = await supabaseFetch(config, objectUrl(config), {
    method: "GET"
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 400 && body.toLowerCase().includes("bucket not found")) {
      return [];
    }
    throw new Error(`Supabase storage load failed: ${response.status} ${body}`);
  }

  const parsed = await response.json() as Partial<StoredData> | Product[];
  return Array.isArray(parsed) ? parsed : parsed.products ?? [];
}

async function saveProductsToSupabase(config: StorageConfig, products: Product[]): Promise<void> {
  await ensureBucket(config);

  const payload: StoredData = {
    updatedAt: new Date().toISOString(),
    products
  };

  const response = await supabaseFetch(config, objectUrl(config), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-upsert": "true"
    },
    body: JSON.stringify(payload, null, 2)
  });

  if (!response.ok) {
    throw new Error(`Supabase storage save failed: ${response.status} ${await response.text()}`);
  }
}

async function ensureBucket(config: StorageConfig): Promise<void> {
  const response = await supabaseFetch(config, `${trimTrailingSlash(config.supabaseUrl!)}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      id: config.supabaseStorageBucket,
      name: config.supabaseStorageBucket,
      public: false
    })
  });

  if (response.ok || response.status === 409) {
    return;
  }

  const body = await response.text();
  if (response.status === 400 && body.toLowerCase().includes("already")) {
    return;
  }

  throw new Error(`Supabase bucket setup failed: ${response.status} ${body}`);
}

async function supabaseFetch(config: StorageConfig, url: string, init: RequestInit): Promise<Response> {
  const key = config.supabaseServiceRoleKey;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  }

  return fetch(url, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...init.headers
    }
  });
}

function objectUrl(config: StorageConfig): string {
  return `${trimTrailingSlash(config.supabaseUrl!)}/storage/v1/object/${encodeURIComponent(config.supabaseStorageBucket)}/${config.supabaseStorageObject.split("/").map(encodeURIComponent).join("/")}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
