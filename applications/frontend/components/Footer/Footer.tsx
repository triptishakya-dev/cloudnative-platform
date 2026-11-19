import Link from "next/link";
import FooterLinkColumn from "./FooterLinkColumn";
import { FOOTER_COLUMNS, SOCIAL_LINKS } from "./footerConfig";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-6 py-14">
        {/* Top section */}
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2 flex flex-col gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg tracking-tight text-zinc-900 dark:text-white w-fit"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold">
                CN
              </span>
              CloudNativ
            </Link>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
              Build, deploy, and scale cloud-native applications with confidence.
            </p>
            {/* Social links */}
            <div className="flex gap-4">
              {SOCIAL_LINKS.map((social) => (
                <Link
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  {social.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((column) => (
            <FooterLinkColumn key={column.title} column={column} />
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800 sm:flex-row">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            &copy; {year} CloudNativ, Inc. All rights reserved.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Built with Next.js &amp; Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
