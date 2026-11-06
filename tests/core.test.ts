import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,scryptSync} from 'node:crypto';
import {initialState,parseState,addCourse,changeCourse,changePlan,snapshot,type State} from '../lib/course-state';
import {summarize} from '../lib/model';
import {mutate,type StoreDriver} from '../lib/blob-storage';
import {ApiError,sameOrigin,readJson} from '../lib/http';
import {authReady,verifyPassword,issueSession,validSession} from '../lib/admin-auth';
test('源表导入保留72门课程和最低要求，空白不当成零',()=>{const s=initialState();assert.equal(s.courses.length,72);assert.equal(summarize(s.courses,s.plan.data).planCredits,147.5);assert.equal(summarize(s.courses,s.plan.data).planHours,2472);assert.equal(s.courses.find(c=>c.name==='离散数学')?.practiceHours,null);assert.equal(s.courses[0].semesters[1],null);});
test('新增编辑、重复编码、旧版本、删除恢复和访客过滤',()=>{
 const s=initialState(),base={...s.courses[0],name:'测试课程',code:'QA-1'};const id=addCourse(s,base);let c=s.courses.find(c=>c.id===id)!;
 assert.throws(()=>addCourse(s,base),/编码已存在/);
 changeCourse(s,id,{revision:1,action:'update',data:{...base,name:'编辑后的课程'}});assert.equal(c.name,'编辑后的课程');
 assert.throws(()=>changeCourse(s,id,{revision:1,action:'delete'}),/已更新/);
 changeCourse(s,id,{revision:2,action:'delete'});assert.equal(snapshot(s,false).courses.length,72);assert.equal(snapshot(s,true).courses.length,73);
 changeCourse(s,id,{revision:3,action:'restore'});assert.equal(c.deletedAt,null);assert.equal(c.revision,4);
 assert.throws(()=>addCourse(s,{...base,code:'QA-2',hours:-1}));assert.throws(()=>addCourse(s,{...base,code:'QA-2',hours:100}));
});
test('修读要求验证和备份导入拒绝重复数据',()=>{const s=initialState();changePlan(s,{revision:1,data:{...s.plan.data,publicCredits:9}});assert.equal(s.plan.data.publicCredits,9);assert.throws(()=>changePlan(s,{revision:1,data:s.plan.data}),/已更新/);assert.deepEqual(parseState(s),s);s.courses.push({...s.courses[0]});assert.throws(()=>parseState(s),/不能重复/);});
class MemoryDriver implements StoreDriver {state=initialState();version=1;async read(){return {state:structuredClone(this.state),etag:String(this.version)};}async write(state:State,etag:string|null){if(etag!==String(this.version))throw new ApiError(409,'并发冲突');this.state=structuredClone(state);this.version++;}}
test('文件存储并发控制避免两个写入互相覆盖',async()=>{const driver=new MemoryDriver();const results=await Promise.allSettled([mutate(s=>addCourse(s,{...s.courses[0],code:'A'}),driver),mutate(s=>addCourse(s,{...s.courses[0],code:'B'}),driver)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(driver.state.courses.length,73);assert.equal(driver.version,2);});
test('校验失败不会调用存储写入',async()=>{const driver=new MemoryDriver();await assert.rejects(()=>mutate(s=>addCourse(s,{...s.courses[0],hours:-4}),driver));assert.equal(driver.version,1);assert.equal(driver.state.courses.length,72);});
test('写入请求拒绝跨站、缺失来源、超大数据和错误JSON',async()=>{
 const request=(headers:Record<string,string>={},body='{}')=>new Request('https://course.example/api/courses',{method:'POST',headers,body});
 assert.throws(()=>sameOrigin(request()),/跨站/);assert.throws(()=>sameOrigin(request({origin:'https://evil.example'})),/跨站/);assert.doesNotThrow(()=>sameOrigin(request({origin:'https://course.example'})));
 assert.doesNotThrow(()=>sameOrigin(new Request('http://localhost:3187/api/courses',{headers:{host:'127.0.0.1:3187',origin:'http://127.0.0.1:3187'}})));
 assert.throws(()=>sameOrigin(new Request('http://localhost:3187/api/courses',{headers:{host:'127.0.0.1:3187',origin:'http://evil.example'}})),/跨站/);
 await assert.rejects(()=>readJson(request({'content-type':'application/json'},'[')),/JSON/);
 await assert.rejects(()=>readJson(request({'content-type':'application/json'},'012345'),4),/过大/);
});
test('管理员密码、签名防篡改和改密撤销',async()=>{
 const password=randomBytes(24).toString('base64url'),salt=randomBytes(16).toString('hex');
 process.env.ADMIN_PASSWORD_HASH=`scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`;process.env.SESSION_SECRET=randomBytes(48).toString('base64url');
 assert.equal(authReady(),true);assert.equal(await verifyPassword(password),true);assert.equal(await verifyPassword('not-the-password-at-all'),false);
 const token=await issueSession();assert.equal(await validSession(token),true);assert.equal(await validSession(token+'tampered'),false);assert.equal(await validSession(undefined),false);
 const salt2=randomBytes(16).toString('hex');process.env.ADMIN_PASSWORD_HASH=`scrypt:${salt2}:${scryptSync(password,salt2,64).toString('hex')}`;assert.equal(await validSession(token),false);
 delete process.env.ADMIN_PASSWORD_HASH;delete process.env.SESSION_SECRET;assert.equal(authReady(),false);
});
