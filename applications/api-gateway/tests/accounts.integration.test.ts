import { it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { buildApp } from "../src/app.js";
import { accountSchema } from "../src/accounts/database.js";
it("registers customers, signs in, verifies sessions, and prevents role escalation",async()=>{
 const schema=`auth_test_${randomUUID().replaceAll("-","")}`;
 const base=process.env.AUTH_DATABASE_URL ?? "postgresql://cloudnative:change-me@127.0.0.1:5432/auth_db";
 const admin=new Pool({connectionString:base});const url=new URL(base);url.searchParams.set("options",`-c search_path=${schema}`);
 const pool=new Pool({connectionString:url.toString()});const old=process.env.AUTH_DATABASE_URL;
 let app:ReturnType<typeof buildApp> | undefined;
 try{
  await admin.query(`CREATE SCHEMA "${schema}"`);await pool.query(accountSchema);
  process.env.AUTH_DATABASE_URL=url.toString();app=buildApp();await app.ready();
  const credentials={email:"customer@example.com",password:"integration-account-password"};
  const register=await app.inject({method:"POST",url:"/auth/register",payload:credentials});assert.equal(register.statusCode,201);
  const result=register.json();assert.equal(result.user.role,"customer");assert.ok(result.token);assert.equal(result.expiresIn,900);
  assert.equal((await app.inject({method:"GET",url:"/auth/me",headers:{authorization:`Bearer ${result.token}`}})).json().user.email,credentials.email);
  assert.equal((await app.inject({method:"POST",url:"/auth/register",payload:credentials})).statusCode,409);
  const elevated=await app.inject({method:"POST",url:"/auth/register",payload:{...credentials,email:"bad@example.com",role:"admin"}});
  assert.equal(elevated.statusCode,201);assert.equal(elevated.json().user.role,"customer");
  assert.equal((await app.inject({method:"POST",url:"/auth/login",payload:{...credentials,password:"wrong"}})).statusCode,401);
  assert.equal((await app.inject({method:"POST",url:"/auth/login",payload:credentials})).statusCode,200);
  assert.equal((await app.inject({method:"POST",url:"/api/v1/catalog/products",headers:{authorization:`Bearer ${result.token}`},payload:{}})).statusCode,403);
  assert.equal((await app.inject({method:"GET",url:"/auth/me"})).statusCode,401);
  const row=(await pool.query("SELECT password_hash FROM accounts")).rows[0];assert.notEqual(row.password_hash,credentials.password);
 }finally{
  await app?.close();await pool.end();await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await admin.end();
  if(old===undefined)delete process.env.AUTH_DATABASE_URL;else process.env.AUTH_DATABASE_URL=old;
 }
});
