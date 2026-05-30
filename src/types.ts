export type WatchSource = {
  name: string;
  productsJsonUrl: string;
  productBaseUrl: string;
};

export type Product = {
  category: string;
  id?: string;
  name: string;
  price?: string;
  url: string;
  available?: boolean;
  imageUrl?: string;
  publishedAt?: string;
  collectedAt: string;
};

export type StoredData = {
  updatedAt: string;
  products: Product[];
};
