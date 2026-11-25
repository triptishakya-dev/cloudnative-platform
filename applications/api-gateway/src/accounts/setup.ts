import { randomUUID } from "node:crypto";
import { Client } from "pg";
import "../config.js";
import { accountsPool, accountSchema } from "./database.js";
import { hashPassword } from "./password.js";
const pool=accountsPool();const name=decodeURIComponent(new URL(String(pool.options.connectionString)).pathname.slice(1));
if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))throw new Error("Invalid account database name");
const admin=new Client({connectionString:process.env.AUTH_DATABASE_ADMIN_URL ?? "postgresql://cloudnative:change-me@127.0.0.1:5432/cloudnative",connectionTimeoutMillis:5000});
try{await admin.connect();const result=await admin.query("SELECT 1 FROM pg_database WHERE datname=$1",[name]);if(!result.rowCount)await admin.query(`CREATE DATABASE "${name}"`);}finally{await admin.end();}
try{
 await pool.query(accountSchema);
 if(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD){
  if(process.env.ADMIN_PASSWORD.length<12 || process.env.ADMIN_PASSWORD.length>128)throw new Error("Administrator password must be 12–128 characters");
  const hash=await hashPassword(process.env.ADMIN_PASSWORD);
  const result=await pool.query("INSERT INTO accounts(id,email,password_hash,role) VALUES($1,$2,$3,'admin') ON CONFLICT(email) DO NOTHING RETURNING id",[randomUUID(),process.env.ADMIN_EMAIL.trim().toLowerCase(),hash]);
  console.log(result.rowCount ? "Administrator account created" : "Account already exists; no credentials or permissions were changed");
 }
 console.log("Account database ready");
}finally{await pool.end();}
