import fs from 'node:fs';
import assert from 'node:assert/strict';
const document = JSON.parse(fs.readFileSync('document-structure.json','utf8').replace(/^\uFEFF/,''));
const source = document.find(e=>e.index===66);
assert.equal(source.type,'table');
const grid=[];
for(const [r,row] of source.rows.entries()) {
  const cells=[]; let col=0;
  for(const cell of row) {
    const value=cell.text.replaceAll('\\n','\n').trim();
    const continued=cell.merge!==null && cell.merge!=='restart';
    for(let k=0;k<cell.span;k++) cells[col+k]=continued ? grid[r-1]?.[col+k]??'' : value;
    col+=cell.span;
  }
  assert.equal(col,18,`row ${r} column count`); grid.push(cells);
}
const number=s=>s===''?null:Number(s);
const courses=[];
for(let r=5;r<grid.length;r++) {
  const c=grid[r]; if(!/^\d+$/.test(c[3])) continue;
  const names=c[4].split('\n');
  if(names.length===1 && names[0].includes('College English')) {
    const index=names[0].indexOf('College English'); names.push(names[0].slice(index)); names[0]=names[0].slice(0,index);
  }
  const item={id:`source-${r}`,name:names[0].trim(),englishName:names.slice(1).join(' ').replace(/\s+/g,' ').trim(),code:c[3],category:c[0].replace(/\s/g,''),nature:c[1],assessment:c[5]==='试'?'考试':c[5]==='查'?'考查':c[5],hours:number(c[6]),credits:number(c[7]),theoryHours:number(c[8]),practiceHours:number(c[9]),semesters:c.slice(10,18).map(number),notes:'',sourceRow:r+1,sourceSequence:number(c[2])};
  assert(item.name && item.category && item.semesters.length===8);
  assert.equal((item.theoryHours??0)+(item.practiceHours??0),item.hours,item.name);
  courses.push(item);
}
assert.equal(courses.length,72); assert.equal(new Set(courses.map(c=>c.code)).size,72);
const required=courses.filter(c=>c.nature==='必修课');
assert.equal(required.reduce((s,c)=>s+c.credits,0),126.5);
const plan={publicCredits:8,publicHours:128,publicTheoryHours:null,publicPracticeHours:128,professionalCredits:13,professionalHours:208,professionalTheoryHours:136,professionalPracticeHours:72,publicCategories:['人文科学类','社会科学类','自然科学类'],publicNote:grid[51][10],professionalNote:'毕业前至少修满13学分。原表小计按最低修读要求填写，不等于全部任选课程之和。'};
const data={sourceFile:'2025版人工智能专业培养方案 (修改第九版).docx',sourceSection:'十二、课程设置与教学安排表',courses,plan,originalTotals:{credits:147.5,hours:2472,theoryHours:1610,practiceHours:862},semesterWeeks:[15,16,16,16,16,16,12,0]};
fs.mkdirSync('data',{recursive:true});fs.writeFileSync('data/seed.json',JSON.stringify(data,null,2)+'\n');
fs.writeFileSync('data/source-table.json',JSON.stringify({grid},null,2)+'\n');
console.log(JSON.stringify({courses:courses.length,required:required.length,requiredCredits:126.5,catalogCredits:courses.reduce((s,c)=>s+c.credits,0),catalogHours:courses.reduce((s,c)=>s+c.hours,0),planCredits:126.5+8+13}));
