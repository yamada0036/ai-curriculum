import {cookies} from 'next/headers';
import {sessionCookie,cookieOptions} from '@/lib/admin-auth';
import {json,fail,sameOrigin} from '@/lib/http';
export async function POST(request:Request){try{sameOrigin(request);(await cookies()).set(sessionCookie(),'',{...cookieOptions(),maxAge:0});return json({ok:true});}catch(e){return fail(e);}}
