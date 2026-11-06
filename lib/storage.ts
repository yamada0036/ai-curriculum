import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import seed from '@/data/seed.json';
import type { Course, PlanRecord } from './model';
export class ApiError extends Error {constructor(public status:number,message:string){super(message);}}
export async function context(request:Request){
  const user=await getChatGPTUser();
  if(!user)throw new ApiError(401,'请先登录后再管理课程');
  if(request.method!=='GET'){
    const origin=request.headers.get('origin');
    if(origin && origin!==new URL(request.url).origin)throw new ApiError(403,'请求来源不匹配');
  }
  if(!env.DB)throw new ApiError(503,'数据库暂时不可用，请稍后重试');
  return {db:env.DB,owner:user.userId};
}
export async function initialize(db:D1Database,owner:string){
  if(await db.prepare('SELECT owner FROM plans WHERE owner=?').bind(owner).first())return;
  const time=new Date().toISOString();
  const statements=seed.courses.map((c,i)=>{const {id,...data}=c;return db.prepare('INSERT INTO courses (owner,id,data,position,revision,updated_at) SELECT ?,?,?,?,1,? WHERE NOT EXISTS (SELECT 1 FROM plans WHERE owner=?) ON CONFLICT(owner,id) DO NOTHING').bind(owner,id,JSON.stringify(data),i,time,owner);});
  statements.push(db.prepare('INSERT OR IGNORE INTO plans (owner,data,revision,updated_at) VALUES (?,?,1,?)').bind(owner,JSON.stringify(seed.plan),time));
  await db.batch(statements);
}
export async function list(db:D1Database,owner:string){
  const result=await db.prepare('SELECT * FROM courses WHERE owner=? ORDER BY position,id').bind(owner).all<{id:string;data:string;position:number;revision:number;deleted_at:string|null;updated_at:string}>();
  const courses:Course[]=result.results.map(r=>({...JSON.parse(r.data),id:r.id,position:r.position,revision:r.revision,deletedAt:r.deleted_at,updatedAt:r.updated_at}));
  const p=await db.prepare('SELECT * FROM plans WHERE owner=?').bind(owner).first<{data:string;revision:number;updated_at:string}>();
  if(!p)throw new ApiError(500,'培养方案尚未初始化');
  const plan:PlanRecord={data:JSON.parse(p.data),revision:p.revision,updatedAt:p.updated_at};
  return {courses,plan};
}
export function fail(error:unknown){
  if(error instanceof ApiError)return Response.json({error:error.message},{status:error.status});
  console.error('Course request failed',error);
  return Response.json({error:'操作失败，请稍后重试。'},{status:500});
}
