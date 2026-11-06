import { z } from 'zod';
const amount=z.number().finite().min(0).max(10000).nullable();
export const courseSchema=z.object({
  name:z.string().trim().min(1,'请输入课程名称').max(200), englishName:z.string().trim().max(400),
  code:z.string().trim().max(64), category:z.string().trim().min(1,'请选择课程类别').max(80),
  nature:z.enum(['必修课','选修课','任选课']), assessment:z.enum(['考试','考查','其他','']),
  hours:amount,credits:amount,theoryHours:amount,practiceHours:amount,
  semesters:z.array(amount).length(8), notes:z.string().max(3000),
  sourceRow:z.number().int().optional(), sourceSequence:z.number().int().nullable().optional(),
}).superRefine((v,ctx)=>{
  if(v.hours!==null&&v.theoryHours!==null&&v.practiceHours!==null&&Math.abs(v.hours-v.theoryHours-v.practiceHours)>0.001)
    ctx.addIssue({code:'custom',path:['hours'],message:'总学时必须等于理论学时与实践学时之和'});
});
export const planSchema=z.object({
  publicCredits:z.number().min(0).max(1000),publicHours:z.number().min(0).max(10000),publicTheoryHours:amount,publicPracticeHours:amount,
  professionalCredits:z.number().min(0).max(1000),professionalHours:z.number().min(0).max(10000),professionalTheoryHours:amount,professionalPracticeHours:amount,
  publicCategories:z.array(z.string().trim().min(1).max(80)).min(1).max(30),publicNote:z.string().max(3000),professionalNote:z.string().max(3000),
}).superRefine((v,ctx)=>{
  for(const prefix of ['public','professional'] as const){
    const t=v[`${prefix}TheoryHours`],p=v[`${prefix}PracticeHours`];
    if(t!==null&&p!==null&&Math.abs(v[`${prefix}Hours`]-t-p)>0.001)ctx.addIssue({code:'custom',message:'要求总学时应等于理论与实践学时之和'});
  }
});
export type CourseData=z.infer<typeof courseSchema>;
export type Course=CourseData & {id:string;position:number;revision:number;deletedAt:string|null;updatedAt:string};
export type Plan=z.infer<typeof planSchema>;
export type PlanRecord={data:Plan;revision:number;updatedAt:string};
export function emptyCourse():CourseData{return {name:'',englishName:'',code:'',category:'专业课',nature:'必修课',assessment:'考试',hours:null,credits:null,theoryHours:null,practiceHours:null,semesters:Array(8).fill(null),notes:''};}
export function summarize(courses:CourseData[],plan:Plan){
  const required=courses.filter(c=>c.nature==='必修课');
  const sum=(rows:CourseData[],key:'credits'|'hours'|'theoryHours'|'practiceHours')=>rows.reduce((s,c)=>s+(c[key]??0),0);
  return {catalogCredits:sum(courses,'credits'),catalogHours:sum(courses,'hours'),requiredCredits:sum(required,'credits'),requiredHours:sum(required,'hours'),planCredits:sum(required,'credits')+plan.publicCredits+plan.professionalCredits,planHours:sum(required,'hours')+plan.publicHours+plan.professionalHours};
}
