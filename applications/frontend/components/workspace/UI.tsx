import Link from "next/link";
import { Icon } from "./Icon";
export function Empty({ title, message, href, label, icon = "box" }: { title: string; message: string; href?: string; label?: string; icon?: string }) { return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={28}/></div><h2>{title}</h2><p>{message}</p>{href && <Link className="button button-primary" href={href}>{label}</Link>}</div>; }
export function Failure({ message, retry }: { message: string; retry?: () => void }) { return <div className="error-banner" role="alert"><Icon name="info"/><span>{message}</span>{retry && <button onClick={retry}>Try again</button>}</div>; }
export function Skeleton() { return <div className="skeleton-grid" aria-busy="true" aria-label="Loading products">{[1,2,3,4,5,6].map(i=><div className="skeleton-card" key={i}><div/><span/><span/></div>)}</div>; }
export function Status({ value }: { value: string }) { return <span className={`status status-${value.toLowerCase()}`}><span/>{value.charAt(0)+value.slice(1).toLowerCase()}</span>; }
export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) { return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{action}</div>; }
