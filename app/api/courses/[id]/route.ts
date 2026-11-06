import {mutate} from '@/lib/blob-storage';
import {requireAdmin} from '@/lib/admin-auth';
import {changeCourse} from '@/lib/course-state';
import {json,fail,readJson} from '@/lib/http';
type Params={params:Promise<{id:string}>};
export const runtime='nodejs';
export async function PATCH(request:Request,{params}:Params){try{
  await requireAdmin(request);const {id}=await params;const body=await readJson(request);
  await mutate(state=>changeCourse(state,id,body));return json({ok:true});
}catch(e){return fail(e);}}
