import {mutate} from '@/lib/blob-storage';
import {requireAdmin} from '@/lib/admin-auth';
import {changePlan} from '@/lib/course-state';
import {json,fail,readJson} from '@/lib/http';
export const runtime='nodejs';
export async function PUT(request:Request){try{
  await requireAdmin(request);const body=await readJson(request);
  await mutate(state=>changePlan(state,body));return json({ok:true});
}catch(e){return fail(e);}}
