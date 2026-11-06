import assert from 'node:assert/strict';
import {randomBytes,scryptSync} from 'node:crypto';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';

// Isolate this test from real storage and never print its temporary credentials.
const listener=createServer();
await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));
const port=listener.address().port;
await new Promise(resolve=>listener.close(resolve));
const base=`http://127.0.0.1:${port}`;
const password=randomBytes(24).toString('base64url'),salt=randomBytes(16).toString('hex');
const env={...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',
  ADMIN_PASSWORD_HASH:`scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`,
  SESSION_SECRET:randomBytes(48).toString('base64url'),
  BLOB_READ_WRITE_TOKEN:'',BLOB_STORE_ID:'',VERCEL:'',VERCEL_ENV:''};
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port),'-H','127.0.0.1'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),env,windowsHide:true,stdio:'ignore'});
let startupError;
child.on('error',e=>{startupError=e;});
let checks=0;
const expectStatus=(response,status)=>{assert.equal(response.status,status);checks++;};
const request=(path,method='GET',data,headers={})=>fetch(base+path,{
  method,headers:{origin:base,...(data===undefined?{}:{'content-type':'application/json'}),...headers},
  body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(10000)});
try{
  let ready=false;
  for(let i=0;i<60;i++){
    if(startupError)throw startupError;
    if(child.exitCode!==null)throw new Error('Test server exited before readiness');
    try{const r=await fetch(base+'/api/courses',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
    await delay(250);
  }
  assert.ok(ready,'Production server did not become ready');
  expectStatus(await request('/'),200);
  const publicResponse=await request('/api/courses');expectStatus(publicResponse,200);
  assert.match(publicResponse.headers.get('cache-control'),/no-store/);
  const data=await publicResponse.json();
  assert.equal(data.courses.length,72);assert.equal(data.access.isAdmin,false);assert.equal(data.access.canEdit,false);
  const first=data.courses[0];
  const writes=[['/api/courses','POST',{...first,code:'HTTP-QA'}],
    [`/api/courses/${first.id}`,'PATCH',{action:'delete',revision:1}],
    ['/api/plan','PUT',{revision:1,data:data.plan.data}],
    ['/api/import','POST',{version:null,data:{schemaVersion:1,courses:data.courses,plan:data.plan}}]];
  for(const [path,method,body] of writes)expectStatus(await request(path,method,body),401);
  expectStatus(await request('/api/auth/login','POST',{password},{origin:'https://untrusted.example'}),403);
  expectStatus(await request('/api/auth/login','POST',{password},{origin:''}),403);
  expectStatus(await request('/api/auth/login','POST',{password:'incorrect-password-for-test'}),401);
  expectStatus(await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'['}),400);
  const login=await request('/api/auth/login','POST',{password});expectStatus(login,200);
  const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/i);assert.match(setCookie,/SameSite=strict/i);
  const cookie=setCookie.split(';')[0];
  const admin=await request('/api/courses','GET',undefined,{cookie});expectStatus(admin,200);
  const authenticated=await admin.json();assert.equal(authenticated.access.isAdmin,true);assert.equal(authenticated.access.canEdit,false);
  for(const [path,method,body] of writes)expectStatus(await request(path,method,body,{cookie}),503);
  assert.equal((await (await request('/api/courses')).json()).courses.length,72);
  const logout=await request('/api/auth/logout','POST',{}, {cookie});expectStatus(logout,200);
  assert.match(logout.headers.get('set-cookie'),/Max-Age=0/i);
  console.log(`Production HTTP verification passed: ${checks} status checks plus public data, cookie and no-storage assertions.`);
}finally{
  if(child.exitCode===null){const closed=new Promise(resolve=>child.once('exit',resolve));child.kill();await closed;}
}
