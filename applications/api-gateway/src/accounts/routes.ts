import { createHmac, randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config.js";
import { accountsPool } from "./database.js";
import { hashPassword, checkPassword } from "./password.js";
interface Credentials { email: string; password: string; }
interface Account { id: string; email: string; password_hash: string; role: "customer" | "admin"; }
const credentialsSchema = (register: boolean) => ({ body: {type:"object",required:["email","password"],additionalProperties:false,properties:{email:{type:"string",format:"email",maxLength:320},password:{type:"string",minLength:register ? 12 : 1,maxLength:128}}} });
function session(account: Account) {
 const now=Math.floor(Date.now()/1000), expiresIn=900;
 const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString("base64url");
 const head=encode({alg:"HS256",typ:"JWT"});
 const body=encode({sub:account.id,email:account.email,role:account.role,iat:now,exp:now+expiresIn});
 const signature=createHmac("sha256",config.JWT_SECRET).update(`${head}.${body}`).digest("base64url");
 return {token:`${head}.${body}.${signature}`,expiresIn,user:{id:account.id,email:account.email,role:account.role}};
}
export async function accountRoutes(app: FastifyInstance) {
 const pool=accountsPool(); pool.on("error",err=>app.log.error({err},"Account database error"));
 const dummy=await hashPassword(randomUUID());
 const limits=new Map<string,{count:number;reset:number}>();
 const limit=async(req:FastifyRequest,reply:FastifyReply)=>{
  const now=Date.now(); let window=limits.get(req.ip);
  if(!window || window.reset<=now){window={count:0,reset:now+15*60_000};limits.set(req.ip,window);}
  if(++window.count>20)return reply.code(429).send({message:"Too many sign-in attempts. Please try again later."});
 };
 const cleanup=setInterval(()=>{for(const [key,window] of limits)if(window.reset<Date.now())limits.delete(key);},60_000).unref();
 app.addHook("onClose",async()=>{clearInterval(cleanup);await pool.end();});
 app.post<{Body:Credentials}>("/auth/register",{schema:credentialsSchema(true),onRequest:limit},async(req,reply)=>{
  const email=req.body.email.trim().toLowerCase();
  try{
   const hash=await hashPassword(req.body.password);
   const {rows}=await pool.query<Account>("INSERT INTO accounts(id,email,password_hash,role) VALUES($1,$2,$3,'customer') RETURNING *",[randomUUID(),email,hash]);
   return reply.code(201).send(session(rows[0]));
  }catch(err){if((err as {code?:string}).code==="23505")return reply.code(409).send({message:"An account already exists with this email. Please sign in."});throw err;}
 });
 app.post<{Body:Credentials}>("/auth/login",{schema:credentialsSchema(false),onRequest:limit},async(req,reply)=>{
  const {rows}=await pool.query<Account>("SELECT * FROM accounts WHERE email=$1",[req.body.email.trim().toLowerCase()]);
  const account=rows[0];const valid=await checkPassword(req.body.password,account?.password_hash ?? dummy);
  if(!account || !valid)return reply.code(401).send({message:"Email or password is incorrect."});
  return reply.send(session(account));
 });
 app.get("/auth/me",{onRequest:app.authenticate},async(req,reply)=>{
  const {rows}=await pool.query<Account>("SELECT id,email,role FROM accounts WHERE id::text=$1",[req.user!.sub]);
  if(!rows.length)return reply.code(401).send({message:"Please sign in again."});
  return reply.send({user:rows[0]});
 });
}
