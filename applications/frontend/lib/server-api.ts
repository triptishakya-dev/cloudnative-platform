import "server-only";
import { cookies } from "next/headers";
export const sessionCookie = "cloudnativ_session";
const base = (process.env.API_GATEWAY_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
export function sameOrigin(request: Request) {
 const origin=request.headers.get("origin");
 const expected = new URL(process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:3003").origin;
 // Next's development request URL can use its internal localhost hostname even
 // when the browser opened 127.0.0.1. Keep an explicit browser origin allowlist.
 if (origin) return origin === expected || origin === new URL(request.url).origin;
 return request.headers.get("sec-fetch-site") !== "cross-site";
}
export async function gateway(path: string, options: RequestInit = {}) {
 const token=(await cookies()).get(sessionCookie)?.value;
 return fetch(`${base}${path}`,{...options,cache:"no-store",redirect:"error",headers:{...(options.body && {"content-type":"application/json"}),...(token && {authorization:`Bearer ${token}`}),...options.headers},signal:AbortSignal.timeout(15_000)});
}
export async function body(request: Request) {
 const raw=await request.text();
 if(raw.length>64_000)throw new Error("Request too large");
 return raw;
}
