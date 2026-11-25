import type { Product } from "./types";
export const samples: Product[] = [
  ["Studio Mechanical Keyboard", "KEY-001", "3499", "Thoughtfully spaced keys. A quieter, more satisfying way to work.", 24],
  ["Arc Wireless Mouse", "MSE-002", "1899", "A comfortable companion for your everyday ideas.", 16],
  ["Focus Over-ear Headphones", "AUD-003", "5999", "Make a little room for focus, wherever you work.", 8],
  ["Everyday Desk Lamp", "LMP-004", "2499", "Warm light, clean lines, and an adjustable angle.", 12],
  ["Studio Display", "DSP-005", "14999", "More space for the things you love creating.", 6],
  ["Pocket Bluetooth Speaker", "SPK-006", "2299", "A small speaker with a sound that fills your space.", 0],
].map(([name, sku, price, description, stock], index) => ({ id: `sample-${index + 1}`, name: String(name), sku: String(sku), priceAmount: String(price), description: String(description), inventoryQuantity: Number(stock), priceCurrency: "INR", active: true, version: 1 }));
