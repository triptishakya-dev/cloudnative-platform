export interface NavLinkItem {
  href: string;
  label: string;
  external?: boolean;
}

export const NAV_LINKS: NavLinkItem[] = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/blog", label: "Blog" },
];
