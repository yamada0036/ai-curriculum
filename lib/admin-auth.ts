import {createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {SignJWT,jwtVerify} from 'jose';
import {cookies} from 'next/headers';
import {ApiError,sameOrigin} from './http';
const derive=promisify(scrypt);
export const SESSION_AGE=60*60*8;
export function sessionCookie(){return process.env.VERCEL?'__Host-course-admin':'course-admin';}
export function cookieOptions(){return {httpOnly:true,secure:!!process.env.VERCEL,sameSite:'strict' as const,path:'/',maxAge:SESSION_AGE};}
export function authReady(){return /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.ADMIN_PASSWORD_HASH??'')&&(process.env.SESSION_SECRET?.length??0)>=32;}
function config(){if(!authReady())throw new ApiError(503,'管理员尚未配置，请先设置 ADMIN_PASSWORD_HASH 和 SESSION_SECRET');return {hash:process.env.ADMIN_PASSWORD_HASH!,secret:new TextEncoder().encode(process.env.SESSION_SECRET!)};}
export async function verifyPassword(password:string){
  const {hash}=config();if(password.length<16||password.length>256)return false;
  const [,salt,expected]=hash.split(':');
  const actual=await derive(password,salt,64) as Buffer;
  return timingSafeEqual(actual,Buffer.from(expected,'hex'));
}
function fingerprint(hash:string){return createHash('sha256').update(hash).digest('hex');}
export async function issueSession(){const {hash,secret}=config();return new SignJWT({role:'admin',passwordVersion:fingerprint(hash)}).setProtectedHeader({alg:'HS256'}).setIssuer('ai-curriculum').setAudience('course-admin').setIssuedAt().setExpirationTime(`${SESSION_AGE}s`).sign(secret);}
export async function validSession(token:string|undefined){
  if(!token||!authReady())return false;
  try{const {hash,secret}=config();const {payload}=await jwtVerify(token,secret,{algorithms:['HS256'],issuer:'ai-curriculum',audience:'course-admin',maxTokenAge:`${SESSION_AGE}s`});return payload.role==='admin'&&payload.passwordVersion===fingerprint(hash);}catch{return false;}
}
export async function isAdmin(){return validSession((await cookies()).get(sessionCookie())?.value);}
export async function requireAdmin(request:Request){sameOrigin(request);if(!await isAdmin())throw new ApiError(401,'请先登录管理员账户');}
