import {z} from 'zod';
import seed from '../data/seed.json';
import {courseSchema,planSchema,type Course,type PlanRecord} from './model';
import {ApiError} from './http';
export type State={schemaVersion:1;courses:Course[];plan:PlanRecord};
export function initialState():State{
  const time='2026-11-06T00:00:00.000Z';
  return {schemaVersion:1,courses:seed.courses.map((c,i)=>({...courseSchema.parse(c),id:c.id,position:i,revision:1,deletedAt:null,updatedAt:time})),plan:{data:planSchema.parse(seed.plan),revision:1,updatedAt:time}};
}
const metadata=z.object({id:z.string().min(1).max(100),position:z.number().int().nonnegative(),revision:z.number().int().positive(),deletedAt:z.string().datetime().nullable(),updatedAt:z.string().datetime()});
const savedCourse=z.intersection(courseSchema,metadata);
const stateSchema=z.object({schemaVersion:z.literal(1),courses:z.array(savedCourse).max(5000),plan:z.object({data:planSchema,revision:z.number().int().positive(),updatedAt:z.string().datetime()})});
export function parseState(input:unknown):State{
  const parsed=stateSchema.safeParse(input);if(!parsed.success)throw new ApiError(400,'课程备份格式不正确');
  const value=parsed.data;
  if(new Set(value.courses.map(c=>c.id)).size!==value.courses.length)throw new ApiError(400,'课程 ID 不能重复');
  const codes=value.courses.filter(c=>!c.deletedAt&&c.code).map(c=>c.code);
  if(new Set(codes).size!==codes.length)throw new ApiError(400,'课程编码不能重复');
  return value;
}
function uniqueCode(state:State,code:string,except?:string){if(code&&state.courses.some(c=>c.id!==except&&!c.deletedAt&&c.code===code))throw new ApiError(409,'课程编码已存在，请核对后再保存');}
export function addCourse(state:State,input:unknown){
  const p=courseSchema.safeParse(input);if(!p.success)throw new ApiError(400,p.error.issues[0].message);
  uniqueCode(state,p.data.code);const id=crypto.randomUUID();
  state.courses.push({...p.data,id,position:Math.max(-1,...state.courses.map(c=>c.position))+1,revision:1,deletedAt:null,updatedAt:new Date().toISOString()});return id;
}
export function changeCourse(state:State,id:string,input:unknown){
  const p=z.object({revision:z.number().int().positive(),action:z.enum(['update','delete','restore']),data:z.unknown().optional()}).safeParse(input);
  if(!p.success)throw new ApiError(400,'请求格式或记录版本不正确');
  const body=p.data,course=state.courses.find(c=>c.id===id);if(!course)throw new ApiError(404,'课程不存在');
  if(course.revision!==body.revision)throw new ApiError(409,'该课程已更新，请刷新后重试');
  if(body.action==='update'){
    if(course.deletedAt)throw new ApiError(409,'请先恢复课程');
    const parsed=courseSchema.safeParse(body.data);if(!parsed.success)throw new ApiError(400,parsed.error.issues[0].message);
    uniqueCode(state,parsed.data.code,id);Object.assign(course,parsed.data);
  }else if(body.action==='delete')course.deletedAt=new Date().toISOString();
  else {uniqueCode(state,course.code,id);course.deletedAt=null;}
  course.revision++;course.updatedAt=new Date().toISOString();
}
export function changePlan(state:State,input:unknown){
  const p=z.object({revision:z.number().int().positive(),data:planSchema}).safeParse(input);
  if(!p.success)throw new ApiError(400,p.error.issues[0].message);
  if(state.plan.revision!==p.data.revision)throw new ApiError(409,'修读要求已更新，请刷新后重试');
  state.plan={data:p.data.data,revision:state.plan.revision+1,updatedAt:new Date().toISOString()};
}
export function snapshot(state:State,admin:boolean){return {courses:admin?state.courses:state.courses.filter(c=>!c.deletedAt),plan:state.plan};}
