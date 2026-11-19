"use client";

import { useState } from "react";
import Link from "next/link";
import { NAV_LINKS } from "./navConfig";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        aria-label="Toggle menu"
        onClick={() => setOpen((prev) => !prev)}
        className="flex flex-col gap-1.5 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <span
          className={`block h-0.5 w-6 bg-zinc-800 dark:bg-zinc-200 transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`}
        />
        <span
          className={`block h-0.5 w-6 bg-zinc-800 dark:bg-zinc-200 transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block h-0.5 w-6 bg-zinc-800 dark:bg-zinc-200 transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-16 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/get-started"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            Get Started
          </Link>
        </div>
      )}
    </div>
  );
}
