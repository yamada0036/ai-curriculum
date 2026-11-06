import {context,fail,ApiError} from '@/lib/storage';
import {courseSchema} from '@/lib/model';
import {z} from 'zod';
type Params={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Params){try{
  const {db,owner}=await context(request); const {id}=await params;
  const parsedBody=z.object({revision:z.number().int(),action:z.enum(['update','delete','restore']),data:z.unknown().optional()}).safeParse(await request.json().catch(()=>null));
  if(!parsedBody.success)throw new ApiError(400,'请求格式或记录版本不正确');
  const body=parsedBody.data;
  const current=await db.prepare('SELECT * FROM courses WHERE owner=? AND id=?').bind(owner,id).first<{data:string;revision:number;deleted_at:string|null}>();
  if(!current)throw new ApiError(404,'课程不存在');
  if(current.revision!==body.revision)throw new ApiError(409,'该课程已在其他窗口修改，请刷新后重试');
  let data=current.data,deleted=current.deleted_at;
  if(body.action==='delete')deleted=new Date().toISOString();
  else if(body.action==='restore')deleted=null;
  else if(body.action==='update'){
    if(current.deleted_at)throw new ApiError(409,'请先从回收站恢复课程');
    const parsed=courseSchema.safeParse(body.data); if(!parsed.success)throw new ApiError(400,parsed.error.issues[0].message); data=JSON.stringify(parsed.data);
  }else throw new ApiError(400,'不支持的操作');
  const code=JSON.parse(data).code;
  const result=await db.prepare(`UPDATE courses SET data=?,deleted_at=?,revision=revision+1,updated_at=? WHERE owner=? AND id=? AND revision=?
    AND (? IS NOT NULL OR ?='' OR NOT EXISTS(SELECT 1 FROM courses WHERE owner=? AND id<>? AND deleted_at IS NULL AND json_extract(data,'$.code')=?))`)
    .bind(data,deleted,new Date().toISOString(),owner,id,body.revision,deleted,code,owner,id,code).run();
  if(!result.meta.changes)throw new ApiError(409,'课程编码重复或记录已更新，请刷新后核对');
  return Response.json({ok:true});
}catch(e){return fail(e);}}
