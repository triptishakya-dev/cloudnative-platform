import Link from "next/link";

export default function HeroBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 dark:border-blue-900 dark:bg-blue-950">
      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
        Now in Public Beta
      </span>
    </div>
  );
}
