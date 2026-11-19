import Link from "next/link";
import { FooterColumn } from "./footerConfig";

interface FooterColumnProps {
  column: FooterColumn;
}

export default function FooterLinkColumn({ column }: FooterColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {column.title}
      </h3>
      <ul className="flex flex-col gap-2">
        {column.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
