export class ApiError extends Error {constructor(public status:number,message:string){super(message);}}
export const privateHeaders={'Cache-Control':'private, no-store','Vary':'Cookie'};
export function json(value:unknown,status=200){return Response.json(value,{status,headers:privateHeaders});}
export function fail(error:unknown){
  if(error instanceof ApiError)return json({error:error.message},error.status);
  console.error('Course request failed',error instanceof Error?error.name:'UnknownError');
  return json({error:'操作失败，请稍后重试；本次修改未确认保存。'},500);
}
export function sameOrigin(request:Request){
  const origin=request.headers.get('origin');
  // Next may use its internal listen address in request.url. Host represents
  // the domain reached by the browser, including custom Vercel domains.
  const url=new URL(request.url);
  const expected=`${process.env.VERCEL?'https:':url.protocol}//${request.headers.get('host')||url.host}`;
  if(!origin||origin!==expected||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'不允许跨站提交');
}
export async function readJson(request:Request,maxBytes=32768){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new ApiError(415,'请使用 JSON 格式提交');
  if(Number(request.headers.get('content-length'))>maxBytes)throw new ApiError(413,'提交内容过大');
  const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'请求内容为空');
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maxBytes){await reader.cancel();throw new ApiError(413,'提交内容过大');}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}catch{throw new ApiError(400,'JSON 格式不正确');}
}
