'use client';
import {useEffect,useRef,useState,type ReactNode,type FormEvent} from 'react';
import {courseSchema,planSchema,type CourseData,type Plan} from '@/lib/model';

export function Modal({title,subtitle,children,onClose,wide=false}:{title:string;subtitle?:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  return <dialog ref={ref} className={wide?'modal wide':'modal'} onCancel={e=>{e.preventDefault();onClose();}} aria-labelledby="dialog-title"><header className="modal-head"><div><h2 id="dialog-title">{title}</h2>{subtitle?<p>{subtitle}</p>:null}</div><button type="button" className="icon-button" aria-label="关闭窗口" onClick={onClose}>×</button></header>{children}</dialog>;
}
function Numeric({label,value,onChange,required=false}:{label:string;value:number|null;onChange:(n:number|null)=>void;required?:boolean}){
  return <label className="field"><span>{label}</span><input type="number" min="0" max="10000" step="0.25" required={required} value={value??''} placeholder="未填写" onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))}/></label>;
}
export function CourseEditor({initial,isNew,onSave,onClose,categories}:{initial:CourseData;isNew:boolean;onSave:(data:CourseData)=>Promise<void>;onClose:()=>void;categories:string[]}){
  const [form,setForm]=useState<CourseData>(()=>({...initial,semesters:[...initial.semesters]}));
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  function set<K extends keyof CourseData>(key:K,value:CourseData[K]){setForm(f=>({...f,[key]:value}));}
  const close=()=>{if(!busy&&(JSON.stringify(form)===JSON.stringify(initial)||confirm('当前修改尚未保存，确认关闭？')))onClose();};
  async function submit(e:FormEvent){e.preventDefault();setError('');const parsed=courseSchema.safeParse(form);if(!parsed.success){setError(parsed.error.issues[0].message);return;}setBusy(true);try{await onSave(parsed.data);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <Modal title={isNew?'新增课程':'编辑课程'} subtitle="填写课程信息，保存后同步到课程库" onClose={close} wide><form onSubmit={submit}>
    <div className="modal-body"><fieldset disabled={busy}><h3 className="form-section">基本信息</h3><div className="form-grid">
      <label className="field full"><span>课程名称 <b>*</b></span><input required autoFocus maxLength={200} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="例如：机器学习"/></label>
      <label className="field full"><span>英文名称</span><input maxLength={400} value={form.englishName} onChange={e=>set('englishName',e.target.value)} placeholder="English course name"/></label>
      <label className="field"><span>课程编码</span><input maxLength={64} value={form.code} onChange={e=>set('code',e.target.value)} placeholder="留空表示尚未分配"/></label>
      <label className="field"><span>课程类别 <b>*</b></span><input required list="categories" maxLength={80} value={form.category} onChange={e=>set('category',e.target.value)}/><datalist id="categories">{categories.map(c=><option key={c} value={c}/>)}</datalist></label>
      <label className="field"><span>课程性质</span><select value={form.nature} onChange={e=>set('nature',e.target.value as CourseData['nature'])}>{['必修课','选修课','任选课'].map(n=><option key={n}>{n}</option>)}</select></label>
      <label className="field"><span>考核形式</span><select value={form.assessment} onChange={e=>set('assessment',e.target.value as CourseData['assessment'])}><option value="">未填写</option>{['考试','考查','其他'].map(n=><option key={n}>{n}</option>)}</select></label>
    </div><h3 className="form-section">学分与学时</h3><div className="form-grid four">{([['学分','credits'],['总学时','hours'],['理论学时','theoryHours'],['实践学时','practiceHours']] as const).map(([label,key])=><Numeric key={key} label={label} value={form[key]} onChange={n=>set(key,n)}/>)}</div><p className="help">空白表示原表未填写；填写完整时，总学时应等于理论学时与实践学时之和。</p>
    <h3 className="form-section">开课学期 · 周学时</h3><div className="form-grid four">{form.semesters.map((value,i)=><Numeric key={i} label={`第 ${i+1} 学期`} value={value} onChange={n=>set('semesters',form.semesters.map((v,j)=>i===j?n:v))}/>)}</div><p className="help">在开课学期填写每周学时，支持跨学期开课。未安排的学期留空。</p>
    <label className="field"><span>备注</span><textarea rows={3} value={form.notes} maxLength={3000} onChange={e=>set('notes',e.target.value)} placeholder="补充课程安排、调整原因等"/></label></fieldset>{error?<div className="error" role="alert">{error}</div>:null}</div>
    <footer className="modal-foot"><button type="button" className="button" onClick={close} disabled={busy}>取消</button><button className="button primary" disabled={busy}>{busy?'正在保存…':'保存课程'}</button></footer>
  </form></Modal>;
}
export function PlanEditor({initial,onSave,onClose}:{initial:Plan;onSave:(p:Plan)=>Promise<void>;onClose:()=>void}){
  const [form,setForm]=useState<Plan>(()=>({...initial})),[categoryText,setCategoryText]=useState(initial.publicCategories.join('\n'));
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const close=()=>{if(!busy&&(JSON.stringify(form)===JSON.stringify(initial)&&categoryText===initial.publicCategories.join('\n')||confirm('当前修改尚未保存，确认关闭？')))onClose();};
  async function submit(e:FormEvent){e.preventDefault();const parsed=planSchema.safeParse({...form,publicCategories:categoryText.split('\n').map(s=>s.trim()).filter(Boolean)});if(!parsed.success){setError(parsed.error.issues[0].message);return;}setBusy(true);setError('');try{await onSave(parsed.data);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <Modal title="编辑修读要求" subtitle="公共选修各类别共享一组学分和学时要求" onClose={close} wide><form onSubmit={submit}><div className="modal-body"><fieldset disabled={busy}>
    {(['public','professional'] as const).map(prefix=><section key={prefix}><h3 className="form-section">{prefix==='public'?'公共选修课':'专业任选课'}</h3><div className="form-grid four">{([['最低学分','Credits'],['要求总学时','Hours'],['理论学时','TheoryHours'],['实践学时','PracticeHours']] as const).map(([label,suffix])=>{const key=`${prefix}${suffix}` as const;return <Numeric key={key} label={label} value={form[key]} required={suffix==='Credits'||suffix==='Hours'} onChange={n=>setForm({...form,[key]:n})}/>;})}</div><label className="field"><span>修读说明</span><textarea rows={3} value={form[`${prefix}Note`]} onChange={e=>setForm({...form,[`${prefix}Note`]:e.target.value})}/></label></section>)}
    <label className="field"><span>公共选修方向（每行一个，可增删）</span><textarea rows={4} value={categoryText} onChange={e=>setCategoryText(e.target.value)}/></label></fieldset>{error?<div className="error" role="alert">{error}</div>:null}</div><footer className="modal-foot"><button type="button" className="button" onClick={close} disabled={busy}>取消</button><button className="button primary" disabled={busy}>{busy?'正在保存…':'保存要求'}</button></footer></form></Modal>;
}
