import {blobDriver,mutate,storageReady} from '@/lib/blob-storage';
import {isAdmin,requireAdmin,authReady} from '@/lib/admin-auth';
import {addCourse,snapshot} from '@/lib/course-state';
import {json,fail,readJson} from '@/lib/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{
  const [admin,{state,etag}]=await Promise.all([isAdmin(),blobDriver.read()]);
  return json({...snapshot(state,admin),version:admin?etag:undefined,access:{isAdmin:admin,canEdit:admin&&storageReady(),storageReady:storageReady(),authReady:authReady()}});
}catch(e){return fail(e);}}
export async function POST(request:Request){try{
  await requireAdmin(request);const body=await readJson(request);
  const id=await mutate(state=>addCourse(state,body));return json({id},201);
}catch(e){return fail(e);}}
