import {context,initialize,list,fail,ApiError} from '@/lib/storage';
import {courseSchema} from '@/lib/model';
export async function GET(request:Request){try{const {db,owner}=await context(request);await initialize(db,owner);return Response.json(await list(db,owner),{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(request:Request){try{
  const {db,owner}=await context(request);await initialize(db,owner);
  const body=await request.json().catch(()=>{throw new ApiError(400,'请求格式不正确');});
  const parsed=courseSchema.safeParse(body);if(!parsed.success)throw new ApiError(400,parsed.error.issues[0].message);
  const id=crypto.randomUUID(),time=new Date().toISOString();
  const result=await db.prepare(`INSERT INTO courses (owner,id,data,position,revision,updated_at)
    SELECT ?,?,?,COALESCE((SELECT MAX(position)+1 FROM courses WHERE owner=?),0),1,?
    WHERE ?='' OR NOT EXISTS (SELECT 1 FROM courses WHERE owner=? AND deleted_at IS NULL AND json_extract(data,'$.code')=?)`)
    .bind(owner,id,JSON.stringify(parsed.data),owner,time,parsed.data.code,owner,parsed.data.code).run();
  if(!result.meta.changes)throw new ApiError(409,'课程编码已存在，请核对后再保存');
  return Response.json({id},{status:201});
}catch(e){return fail(e);}}
