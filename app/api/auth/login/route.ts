import {cookies} from 'next/headers';
import {setTimeout as delay} from 'node:timers/promises';
import {z} from 'zod';
import {authReady,verifyPassword,issueSession,sessionCookie,cookieOptions} from '@/lib/admin-auth';
import {ApiError,json,fail,readJson,sameOrigin} from '@/lib/http';
export const runtime='nodejs';
// Additional per-instance throttling; use Vercel Firewall for a global policy.
let windowStart=0,attempts=0;
export async function POST(request:Request){try{
  sameOrigin(request);if(!authReady())throw new ApiError(503,'管理员尚未配置，请按 README 设置管理员登录');
  const now=Date.now();if(now-windowStart>60000){windowStart=now;attempts=0;}if(++attempts>12)throw new ApiError(429,'尝试过于频繁，请一分钟后重试');
  const body=z.object({password:z.string().max(256)}).safeParse(await readJson(request,4096));
  if(!body.success)throw new ApiError(400,'请输入管理员密码');
  const valid=await verifyPassword(body.data.password);if(!valid){await delay(750);throw new ApiError(401,'管理员密码不正确');}
  (await cookies()).set(sessionCookie(),await issueSession(),cookieOptions());
  return json({ok:true});
}catch(e){return fail(e);}}
