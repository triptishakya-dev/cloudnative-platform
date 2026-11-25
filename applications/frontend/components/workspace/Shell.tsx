"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { useWorkspace } from "./Provider";
import { api } from "@/lib/api";
export function Shell({ children }: { children: ReactNode }) {
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{const query=window.matchMedia("(max-width: 760px)");const update=()=>setMobile(query.matches);update();query.addEventListener("change",update);return()=>query.removeEventListener("change",update);},[]);
 const pathname = usePathname(); const [open, setOpen] = useState(false); const { user, refreshSession, cart, sessionLoading } = useWorkspace();
 useEffect(()=>{ if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[open]);
 const count = cart.reduce((sum, item) => sum + item.quantity, 0);
 const nav = [{href:"/products", label:"Product catalog", icon:"grid"}, {href:"/orders", label:"My orders", icon:"box"}, {href:"/orders/new", label:"Review order", icon:"bag"}];
 return <div className="workspace">
 {open && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setOpen(false)} />}
 <aside className={`sidebar ${open ? "sidebar-open" : ""}`} inert={mobile && !open}>
 <Link href="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark"><Icon name="cloud" size={23}/></span>cloudnativ<span className="brand-period">.</span></Link>
 <div className="workspace-switch"><span className="workspace-avatar">CN</span><div><strong>CloudNativ Store</strong><small>Your everyday workspace</small></div></div>
 <p className="nav-label">WORKSPACE</p><nav aria-label="Main navigation">{nav.map(item => { const active = item.href === "/orders" ? pathname === "/orders" || (pathname.startsWith("/orders/") && pathname !== "/orders/new") : pathname.startsWith(item.href) || (item.href === "/products" && pathname === "/"); return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`nav-item ${active ? "nav-active" : ""}`} aria-current={active ? "page" : undefined}><Icon name={item.icon}/>{item.label}{item.icon === "bag" && count > 0 && <span className="nav-count">{count}</span>}</Link>; })}</nav>
 {(!user || user.role === "admin") && <><p className="nav-label">MANAGEMENT</p><Link href="/admin/products" className={`nav-item ${pathname.startsWith("/admin") ? "nav-active" : ""}`} onClick={() => setOpen(false)}><Icon name="settings"/>Manage products</Link></>}
 <div className="sidebar-bottom"><div className="sidebar-note"><span className="mini-logo"><Icon name="box" size={19}/></span><strong>From discovery to delivery.</strong><p>A little less friction.<br/>A little more possibility.</p><Link href="/products">Explore the collection</Link></div><span className="sidebar-caption">CloudNativ · Workspace essentials</span></div>
 </aside>
 <div className="workspace-main"><header className="topbar"><div className="topbar-start"><button className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu"/></button><Link href="/" className="breadcrumb-home">Workspace</Link><Icon name="chevron" size={13}/><span>{pathname.startsWith("/admin") ? "Product management" : pathname.startsWith("/orders") ? "Orders" : pathname === "/login" ? "Your account" : "Catalog"}</span></div><div className="topbar-actions"><Link href="/orders/new" className="icon-button cart-link" aria-label={`Review order, ${count} ${count===1 ? "item" : "items"}`}><Icon name="bag"/>{count > 0 && <span>{count}</span>}</Link><span className="topbar-divider"/>{sessionLoading ? <span className="account-placeholder"/> : user ? <><div className="account-name"><strong>{user.email.split("@")[0]}</strong><small>{user.role === "admin" ? "Administrator" : "Customer"}</small></div><span className="account-avatar">{user.email[0].toUpperCase()}</span><button className="icon-button" aria-label="Sign out" onClick={async () => { await api("/api/session", {method:"DELETE"}); await refreshSession(); }}><Icon name="logout" size={18}/></button></> : <Link className="button button-small button-outline" href="/login"><Icon name="user" size={16}/>Sign in</Link>}</div></header>
 <main id="main-content" className="page-content">{children}</main><footer className="workspace-footer"><span>Thoughtfully selected. Simply ordered.</span><span>CloudNativ © {new Date().getFullYear()}</span></footer></div></div>;
}
