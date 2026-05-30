import type { Product, WatchSource } from "./types.ts";

type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  published_at?: string;
  variants?: Array<{
    id: number;
    available: boolean;
    price: string;
  }>;
  images?: Array<{
    src: string;
  }>;
};

type ShopifyResponse = {
  products?: ShopifyProduct[];
};

export async function collectShopifySource(source: WatchSource): Promise<Product[]> {
  const response = await fetch(source.productsJsonUrl, {
    headers: {
      "accept": "application/json",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`${source.name}: fetch failed with ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as ShopifyResponse;
  const products = payload.products ?? [];
  const collectedAt = new Date().toISOString();

  return products.map((product) => {
    const firstVariant = product.variants?.[0];
    return {
      category: source.name,
      id: String(product.id),
      name: product.title,
      price: firstVariant ? `$${firstVariant.price}` : undefined,
      available: firstVariant?.available,
      imageUrl: product.images?.[0]?.src,
      publishedAt: product.published_at,
      url: new URL(product.handle, source.productBaseUrl).toString(),
      collectedAt
    };
  });
}
