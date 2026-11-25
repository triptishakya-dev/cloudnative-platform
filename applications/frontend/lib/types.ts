export interface Product { id: string; sku: string; name: string; description: string | null; priceAmount: string | number; priceCurrency: string; inventoryQuantity: number; active: boolean; version: number; }
export interface PageResult<T> { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number }; }
export interface User { id: string; email: string; role: "customer" | "admin"; }
export interface OrderItem { id: string; productId: string; productName: string; sku: string; quantity: number; unitPrice: string; lineTotal: string; }
export interface Order { id: string; status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "FAILED"; customerId: string; customerEmail: string; totalAmount: string; currency: string; createdAt: string; updatedAt: string; items: OrderItem[]; }
export interface CartItem { product: Product; quantity: number; }
export const money = (amount: string | number, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount));
export const date = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
