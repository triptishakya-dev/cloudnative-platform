"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { CartItem, Product, User } from "@/lib/types";
interface WorkspaceState { user: User | null; sessionLoading: boolean; refreshSession: () => Promise<void>; cart: CartItem[]; add: (product: Product, quantity?: number) => void; quantity: (id: string, value: number) => void; clear: () => void; toast: (message: string) => void; }
const Context = createContext<WorkspaceState | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<User | null>(null);
 const [sessionLoading, setSessionLoading] = useState(true);
 const [cart, setCart] = useState<CartItem[]>([]);
 const [message, setMessage] = useState("");
 const refreshSession = useCallback(async () => { try { const body = await api<{user: User | null}>("/api/session"); setUser(body.user); } catch { setUser(null); } finally { setSessionLoading(false); } }, []);
 useEffect(() => { void refreshSession(); try { const value = JSON.parse(localStorage.getItem("cloudnativ-cart") ?? "[]"); if (Array.isArray(value)) setCart(value.filter((item: CartItem) => item?.product?.id && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99)); } catch {} }, [refreshSession]);
 useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(""), 3500); return () => clearTimeout(timer); }, [message]);
 const update = (fn: (items: CartItem[]) => CartItem[]) => setCart(items => { const next = fn(items); try { localStorage.setItem("cloudnativ-cart", JSON.stringify(next)); } catch {} return next; });
 const add = (product: Product, quantity = 1) => { if (product.id.startsWith("sample-")) { setMessage("Sample products are for preview only. Switch to the live catalog to order."); return; } update(items => { const existing = items.find(item => item.product.id === product.id); return existing ? items.map(item => item.product.id === product.id ? {...item, quantity: Math.min(99, item.quantity + quantity)} : item) : [...items, { product, quantity }]; }); setMessage(`${product.name} added to your order`); };
 return <Context.Provider value={{ user, sessionLoading, refreshSession, cart, add, quantity: (id, value) => update(items => value <= 0 ? items.filter(item => item.product.id !== id) : items.map(item => item.product.id === id ? {...item, quantity: Math.min(99, value)} : item)), clear: () => update(() => []), toast: setMessage }}>{children}{message && <div className="toast" role="status">{message}</div>}</Context.Provider>;
}
export function useWorkspace() { const state = useContext(Context); if (!state) throw new Error("Workspace provider missing"); return state; }
