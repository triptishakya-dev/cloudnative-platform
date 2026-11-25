"use client";
import { useCallback, useEffect, useState } from "react";
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, headers: { ...(options.body && { "Content-Type": "application/json" }), ...options.headers }, cache: "no-store" });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.message ?? "Something went wrong. Please try again.", response.status);
  return body as T;
}
export function useResource<T>(path: string | null) {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: ApiError }>({ loading: true });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    if (!path) { setState({ loading: false }); return; }
    const controller = new AbortController();
    setState({ loading: true });
    api<T>(path, { signal: controller.signal }).then(data => setState({ data, loading: false })).catch(error => {
      if (!controller.signal.aborted) setState({ loading: false, error });
    });
    return () => controller.abort();
  }, [path, revision]);
  return { ...state, reload };
}
