import Link from "next/link";
import HeroBadge from "./HeroBadge";
import HeroStat from "./HeroStat";

const STATS = [
  { value: "10k+", label: "Developers" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "50ms", label: "Avg. Response" },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-zinc-950">
      {/* Background gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-blue-100/60 blur-3xl dark:bg-blue-950/40" />
        <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-indigo-100/50 blur-3xl dark:bg-indigo-950/30" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-28 sm:py-36 lg:py-40">
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Badge */}
          <HeroBadge />

          {/* Headline */}
          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-white">
            Ship cloud-native apps{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              faster than ever
            </span>
          </h1>

          {/* Subheadline */}
          <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            CloudNativ gives your team a unified platform to build, deploy, observe, and
            scale containerised workloads — without wrestling with infrastructure.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/get-started"
              className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-7 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              Get Started — Free
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 px-7 text-sm font-semibold text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              Read the Docs
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap justify-center gap-10 sm:gap-16 border-t border-zinc-200 dark:border-zinc-800 pt-10 w-full max-w-xl">
            {STATS.map((stat) => (
              <HeroStat key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
