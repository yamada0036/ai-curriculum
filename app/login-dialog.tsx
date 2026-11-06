'use client';
import {useState,type FormEvent} from 'react';
import {Modal} from './editors';
export default function LoginDialog({onClose,onSuccess}:{onClose:()=>void;onSuccess:()=>Promise<void>}){
  const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{
    const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'登录失败');setPassword('');await onSuccess();onClose();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <Modal title="管理员登录" subtitle="访客可直接浏览，管理员登录后可维护课程" onClose={()=>{if(!busy)onClose();}}><form onSubmit={submit}><div className="modal-body"><label className="field" style={{marginTop:20}}><span>管理员密码</span><input autoFocus required type="password" autoComplete="current-password" maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>{error?<div className="error" role="alert">{error}</div>:null}</div><footer className="modal-foot"><button type="button" className="button" disabled={busy} onClick={onClose}>取消</button><button className="button primary" disabled={busy}>{busy?'正在登录…':'登录'}</button></footer></form></Modal>;
}
