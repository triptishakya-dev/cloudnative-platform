import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { WorkspaceProvider } from "@/components/workspace/Provider";
import { Shell } from "@/components/workspace/Shell";
export const metadata: Metadata = { title: { default: "CloudNativ · Workspace essentials", template: "%s · CloudNativ" }, description: "Discover thoughtful workspace essentials. Browse products, place an order, and follow every step." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><Suspense fallback={<div className="initial-loading">Loading your workspace…</div>}><WorkspaceProvider><Shell>{children}</Shell></WorkspaceProvider></Suspense></body></html>; }
