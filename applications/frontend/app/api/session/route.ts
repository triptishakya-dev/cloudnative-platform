import { NextResponse } from "next/server";
import { gateway, sessionCookie, sameOrigin, body } from "@/lib/server-api";
export async function GET(){
 try{const response=await gateway("/auth/me");if(response.status===401){const result=NextResponse.json({user:null},{headers:{"Cache-Control":"no-store"}});result.cookies.delete(sessionCookie);return result;}if(!response.ok)return NextResponse.json({user:null},{status:503});return NextResponse.json(await response.json(),{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({user:null},{status:503});}
}
export async function POST(request: Request){
 if(!sameOrigin(request))return NextResponse.json({message:"This request is not allowed."},{status:403});
 try{
  const values=JSON.parse(await body(request));
  if(!["login","register"].includes(values.action))return NextResponse.json({message:"Choose sign in or create account."},{status:400});
  const response=await gateway(`/auth/${values.action}`,{method:"POST",body:JSON.stringify({email:values.email,password:values.password})});
  const result=await response.json();
  if(!response.ok)return NextResponse.json({message:result.message ?? "We couldn’t sign you in."},{status:response.status});
  const next=NextResponse.json({user:result.user},{status:response.status,headers:{"Cache-Control":"no-store"}});
  next.cookies.set(sessionCookie,result.token,{httpOnly:true,sameSite:"lax",secure:new URL(request.url).protocol==="https:",path:"/",maxAge:result.expiresIn});
  return next;
 }catch(error){return NextResponse.json({message:error instanceof SyntaxError ? "Please check the form and try again." : "Sign in is temporarily unavailable. Please try again."},{status:503});}
}
export async function DELETE(request: Request){
 if(!sameOrigin(request))return NextResponse.json({message:"This request is not allowed."},{status:403});
 const response=NextResponse.json({user:null},{headers:{"Cache-Control":"no-store"}});response.cookies.delete(sessionCookie);return response;
}
