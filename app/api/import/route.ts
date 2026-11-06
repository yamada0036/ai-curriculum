import {z} from 'zod';
import {requireAdmin} from '@/lib/admin-auth';
import {blobDriver} from '@/lib/blob-storage';
import {parseState} from '@/lib/course-state';
import {json,fail,ApiError,readJson} from '@/lib/http';
export const runtime='nodejs';
export async function POST(request:Request){try{
  await requireAdmin(request);
  const p=z.object({version:z.string().nullable(),data:z.unknown()}).safeParse(await readJson(request,4*1024*1024));
  if(!p.success)throw new ApiError(400,'备份提交格式不正确');
  const state=parseState(p.data.data),current=await blobDriver.read();
  if(p.data.version!==current.etag)throw new ApiError(409,'当前课程数据已变更，请刷新后重新导入');
  // Increment revisions across replacement so open editors cannot overwrite imported records.
  for(const c of state.courses)c.revision=Math.max(c.revision,current.state.courses.find(x=>x.id===c.id)?.revision??0)+1;
  state.plan.revision=Math.max(state.plan.revision,current.state.plan.revision)+1;
  await blobDriver.write(state,current.etag);return json({ok:true,courses:state.courses.length});
}catch(e){return fail(e);}}
