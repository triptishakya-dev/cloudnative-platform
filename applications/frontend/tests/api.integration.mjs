import { it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { hashPassword } from "../../api-gateway/dist/accounts/password.js";
const require=createRequire(new URL("../../api-gateway/package.json",import.meta.url));
const {Pool}=require("pg");
const base=process.env.FRONTEND_TEST_URL ?? "http://127.0.0.1:3003";
const request=(path,options={})=>fetch(`${base}${path}`,{...options,headers:{"content-type":"application/json",origin:new URL(base).origin,...options.headers}});
const cookie=response=>response.headers.get("set-cookie")?.split(";")[0];
it("bridges public APIs, protects sessions, isolates accounts, and supports administrator product CRUD",async()=>{
 const suffix=randomUUID();const customerEmail=`customer-${suffix}@example.com`,adminEmail=`admin-${suffix}@example.com`,password=`test-${randomUUID()}`;
 const pool=new Pool({connectionString:process.env.AUTH_DATABASE_URL ?? "postgresql://cloudnative:change-me@127.0.0.1:5432/auth_db"});
 let adminCookie,productId,extraProductId;
 try{
  const blocked=await request("/api/session",{method:"POST",headers:{origin:"https://untrusted.example"},body:JSON.stringify({action:"register",email:customerEmail,password})});assert.equal(blocked.status,403);
  const anonymous=await request("/api/session");assert.equal(anonymous.status,200);assert.equal((await anonymous.json()).user,null);
  assert.equal((await request("/api/gateway/orders")).status,401);
  const products=await request("/api/gateway/catalog/products?limit=1");assert.equal(products.status,200);assert.ok(Array.isArray((await products.json()).items));
  const registered=await request("/api/session",{method:"POST",body:JSON.stringify({action:"register",email:customerEmail,password})});assert.equal(registered.status,201);
  assert.match(registered.headers.get("set-cookie"),/HttpOnly/i);assert.match(registered.headers.get("set-cookie"),/SameSite=lax/i);
  const customerCookie=cookie(registered);assert.ok(customerCookie);const registeredBody=await registered.json();assert.equal(registeredBody.token,undefined);assert.equal(registeredBody.user.role,"customer");
  const session=await request("/api/session",{headers:{cookie:customerCookie}});assert.equal((await session.json()).user.email,customerEmail);
  const orders=await request("/api/gateway/orders",{headers:{cookie:customerCookie}});assert.equal(orders.status,200);assert.deepEqual((await orders.json()).items,[]);
  assert.equal((await request("/api/gateway/orders/63ba33d4-7016-4e9e-9e40-8d7445077dd5",{headers:{cookie:customerCookie}})).status,404);
  assert.equal((await request("/api/gateway/catalog/products",{method:"POST",headers:{cookie:customerCookie},body:"{}"})).status,403);
  const logout=await request("/api/session",{method:"DELETE",headers:{cookie:customerCookie}});assert.equal(logout.status,200);assert.match(logout.headers.get("set-cookie"),/Max-Age=0|Expires=/i);
  await pool.query("INSERT INTO accounts(id,email,password_hash,role) VALUES($1,$2,$3,'admin')",[randomUUID(),adminEmail,await hashPassword(password)]);
  const login=await request("/api/session",{method:"POST",body:JSON.stringify({action:"login",email:adminEmail,password})});assert.equal(login.status,200);adminCookie=cookie(login);
  const created=await request("/api/gateway/catalog/products",{method:"POST",headers:{cookie:adminCookie},body:JSON.stringify({sku:`UI-QA-${suffix}`,name:"Temporary UI API test product",priceAmount:100,priceCurrency:"INR",inventoryQuantity:2,active:true})});assert.equal(created.status,201);productId=(await created.json()).id;
  const second=await request("/api/gateway/catalog/products",{method:"POST",headers:{cookie:adminCookie},body:JSON.stringify({sku:`UI-QA-${suffix}-B`,name:"Temporary out-of-stock API test product",priceAmount:200,priceCurrency:"INR",inventoryQuantity:0,active:true})});assert.equal(second.status,201);extraProductId=(await second.json()).id;
  const filtered=await request(`/api/gateway/catalog/products?search=${encodeURIComponent(`UI-QA-${suffix}`)}&active=true&inStock=true&sort=high`);const filteredBody=await filtered.json();assert.equal(filteredBody.meta.total,1);assert.equal(filteredBody.items[0].id,productId);
  const sorted=await request(`/api/gateway/catalog/products?search=${encodeURIComponent(`UI-QA-${suffix}`)}&active=true&sort=high&limit=1&page=1`);const sortedBody=await sorted.json();assert.equal(sortedBody.meta.total,2);assert.equal(sortedBody.items[0].id,extraProductId);

  const updated=await request(`/api/gateway/catalog/products/${productId}`,{method:"PATCH",headers:{cookie:adminCookie},body:JSON.stringify({name:"Updated temporary UI API product",priceAmount:125,active:false})});assert.equal(updated.status,200);const updatedBody=await updated.json();assert.equal(updatedBody.name,"Updated temporary UI API product");assert.equal(updatedBody.active,false);
  assert.equal((await request(`/api/gateway/catalog/products/${productId}`,{method:"DELETE",headers:{cookie:adminCookie}})).status,204);productId=undefined;
 }finally{
  if(extraProductId && adminCookie)await request(`/api/gateway/catalog/products/${extraProductId}`,{method:"DELETE",headers:{cookie:adminCookie}});
  if(productId && adminCookie)await request(`/api/gateway/catalog/products/${productId}`,{method:"DELETE",headers:{cookie:adminCookie}});
  await pool.query("DELETE FROM accounts WHERE email = ANY($1::text[])",[[customerEmail,adminEmail]]);await pool.end();
 }
});
