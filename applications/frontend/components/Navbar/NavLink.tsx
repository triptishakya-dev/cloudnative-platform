import Link from "next/link";

interface NavLinkProps {
  href: string;
  label: string;
  external?: boolean;
}

export default function NavLink({ href, label, external = false }: NavLinkProps) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
    >
      {label}
    </Link>
  );
}
