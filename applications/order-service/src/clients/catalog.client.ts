// HTTP client for the catalog-service
// Fetches product details needed for order pricing snapshots.

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  priceAmount: number;
  priceCurrency: string;
  active: boolean;
}

export class CatalogClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.CATALOG_SERVICE_URL ?? "http://localhost:3001";
  }

  /**
   * Fetches multiple products by ID in a single call.
   * Falls back to individual fetches if the bulk endpoint is not available.
   */
  async fetchProducts(productIds: string[]): Promise<CatalogProduct[]> {
    const unique = [...new Set(productIds)];

    const results = await Promise.all(
      unique.map(async (id) => {
        const res = await fetch(`${this.baseUrl}/api/v1/products/${id}`, {
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5_000),
        });

        if (!res.ok) {
          if (res.status === 404) return null;
          throw Object.assign(
            new Error(`Catalog service error (${res.status}) for product ${id}`),
            { statusCode: 502 }
          );
        }

        return res.json() as Promise<CatalogProduct>;
      })
    );

    return results.filter((p): p is CatalogProduct => p !== null);
  }
}
