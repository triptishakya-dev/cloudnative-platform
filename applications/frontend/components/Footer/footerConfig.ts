export interface FooterLinkItem {
  href: string;
  label: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLinkItem[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/changelog", label: "Changelog" },
      { href: "/roadmap", label: "Roadmap" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "Blog" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/guides", label: "Guides" },
      { href: "/status", label: "Status" },
      { href: "/support", label: "Support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/security", label: "Security" },
    ],
  },
];

export const SOCIAL_LINKS = [
  { href: "https://github.com", label: "GitHub" },
  { href: "https://twitter.com", label: "Twitter" },
  { href: "https://linkedin.com", label: "LinkedIn" },
];
