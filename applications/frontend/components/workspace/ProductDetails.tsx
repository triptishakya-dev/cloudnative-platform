"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useResource } from "@/lib/api";
import { samples } from "@/lib/sample-products";
import { money, type Product } from "@/lib/types";
import { useWorkspace } from "./Provider";
import { ProductArt } from "./ProductArt";
import { Icon } from "./Icon";
import { Failure, Skeleton, Empty } from "./UI";
export default function ProductDetails() {
 const {id} = useParams<{id:string}>(); const preview=id.startsWith("sample-");
 const {data,loading,error,reload}=useResource<Product>(preview ? null : `/api/gateway/catalog/products/${id}`);
 const product=preview ? samples.find(item=>item.id===id) : data;
 const [quantity,setQuantity]=useState(1); const {add}=useWorkspace();
 if(loading && !preview)return <Skeleton/>;
 if(error)return <Failure message={error.status===404 ? "This product is no longer available." : "We couldn’t load this product."} retry={reload}/>;
 if(!product)return <Empty title="Product not found" message="Explore the collection to find something else." href="/products" label="Browse products"/>;
 return <><Link href={preview ? "/products?mode=preview" : "/products"} className="back-link"><Icon name="back" size={16}/>Back to products</Link>{preview && <div className="preview-notice">Sample product · Preview only</div>}<div className="product-detail"><div className="detail-art"><ProductArt name={product.name} large/><span>Product illustration</span></div><div className="detail-copy"><p className="eyebrow">WORKSPACE ESSENTIALS</p><h1>{product.name}</h1><p className="detail-sku">SKU {product.sku}</p><div className="detail-price">{money(product.priceAmount,product.priceCurrency)}</div><p className="detail-description">{product.description || "A practical addition to your everyday setup. Select a quantity and add it to your order."}</p><span className={`status ${product.inventoryQuantity > 0 && product.active ? "status-completed" : "status-cancelled"}`}><span/>{product.inventoryQuantity > 0 && product.active ? `${product.inventoryQuantity} available` : "Currently unavailable"}</span><div className="detail-purchase"><div className="quantity-control"><button aria-label="Decrease quantity" onClick={()=>setQuantity(v=>Math.max(1,v-1))} disabled={quantity===1}><Icon name="minus" size={15}/></button><output aria-label="Quantity">{quantity}</output><button aria-label="Increase quantity" onClick={()=>setQuantity(v=>Math.min(99,product.inventoryQuantity,v+1))} disabled={quantity>=Math.min(99,product.inventoryQuantity)}><Icon name="plus" size={15}/></button></div><button className="button button-primary" disabled={!product.active || product.inventoryQuantity===0} onClick={()=>add(product,quantity)}><Icon name="bag" size={18}/>Add to order</button></div><div className="detail-assurances"><p><Icon name="box" size={18}/>Review your items before placing an order.</p><p><Icon name="mail" size={18}/>Receive an email when your order is received.</p></div></div></div></>;
}
