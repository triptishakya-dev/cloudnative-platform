import type { CSSProperties } from "react";
const paths: Record<string, string> = {
 grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
 box: "m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5",
 bag: "M5 7h14l2 14H3L5 7Zm3 0V5a4 4 0 0 1 8 0v2",
 search: "M21 21l-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
 plus: "M12 5v14M5 12h14", minus: "M5 12h14", check: "m5 12 4 4L19 6",
 close: "m6 6 12 12M6 18 18 6", menu: "M4 6h16M4 12h16M4 18h16",
 chevron: "m9 5 7 7-7 7", down: "m6 9 6 6 6-6", back: "m14 5-7 7 7 7",
 user: "M20 21v-2a7 7 0 0 0-14 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
 logout: "M9 21H4V3h5M9 12h12m-4-4 4 4-4 4", settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
 clock: "M12 8v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
 shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6",
 mail: "M3 5h18v14H3V5Zm0 0 9 8 9-8", trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
 edit: "m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z", refresh: "M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3",
 heart: "M20 5c-2-2-5-2-8 1-3-3-6-3-8-1s-2 5 0 7l8 8 8-8c2-2 2-5 0-7Z", cloud: "M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-2 6 6 0 0 1 0 12H6Z",
 info: "M12 11v6M12 7h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
};
export function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name] ?? paths.box} /></svg>;
}
