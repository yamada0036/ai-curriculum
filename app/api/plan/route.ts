import {context,fail,ApiError} from '@/lib/storage';
import {planSchema} from '@/lib/model';
import {z} from 'zod';
export async function PUT(request:Request){try{
  const {db,owner}=await context(request);const parsedBody=z.object({revision:z.number().int(),data:z.unknown()}).safeParse(await request.json().catch(()=>null));
  if(!parsedBody.success)throw new ApiError(400,'请求格式或方案版本不正确');
  const body=parsedBody.data;
  const parsed=planSchema.safeParse(body.data);if(!parsed.success)throw new ApiError(400,parsed.error.issues[0].message);
  if(!Number.isInteger(body.revision))throw new ApiError(400,'缺少方案版本');
  const result=await db.prepare('UPDATE plans SET data=?,revision=revision+1,updated_at=? WHERE owner=? AND revision=?').bind(JSON.stringify(parsed.data),new Date().toISOString(),owner,body.revision).run();
  if(!result.meta.changes)throw new ApiError(409,'修读要求已更新，请刷新后重试');return Response.json({ok:true});
}catch(e){return fail(e);}}
