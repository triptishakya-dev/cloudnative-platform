import { gateway, sameOrigin, body } from "@/lib/server-api";
type Context = { params: Promise<{ path: string[] }> };
async function forward(request: Request, context: Context){
 if(request.method!=="GET" && !sameOrigin(request))return Response.json({message:"This request is not allowed."},{status:403});
 const {path}=await context.params;const route=path.join("/");
 const uuid="[0-9a-fA-F-]{36}";
 const allowed=new RegExp(`^(catalog/(products|categories)(/${uuid}(/children)?)?|orders(/${uuid}(/(confirm|cancel|complete))?)?)$`);
 if(!allowed.test(route))return Response.json({message:"Page not found."},{status:404});
 try{
  const result=await gateway(`/api/v1/${route}${new URL(request.url).search}`,{method:request.method,...(request.method!=="GET" && {body:await body(request)})});
  const headers={"Content-Type":result.headers.get("content-type") ?? "application/json","Cache-Control":"no-store"};
  return new Response(result.status===204 ? null : await result.text(),{status:result.status,headers});
 }catch{return Response.json({message:"We couldn’t reach the service. Please try again shortly."},{status:502});}
}
export const GET=forward;export const POST=forward;export const PATCH=forward;export const DELETE=forward;
