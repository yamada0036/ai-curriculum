import {get,put,BlobPreconditionFailedError} from '@vercel/blob';
import {createHash} from 'node:crypto';
import {initialState,parseState,type State} from './course-state';
import {ApiError} from './http';
export function storageReady(){return !!(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID);}
export function dataPath(){
  if(process.env.CURRICULUM_BLOB_PATH)return process.env.CURRICULUM_BLOB_PATH;
  if(process.env.VERCEL_ENV==='production')return 'curriculum/production.json';
  if(process.env.VERCEL_ENV==='preview')return `curriculum/preview-${createHash('sha256').update(process.env.VERCEL_GIT_COMMIT_REF||process.env.VERCEL_URL||'preview').digest('hex').slice(0,16)}.json`;
  return 'curriculum/local.json';
}
export type VersionedState={state:State;etag:string|null};
export interface StoreDriver {read:()=>Promise<VersionedState>;write:(state:State,etag:string|null)=>Promise<void>;}
export const blobDriver:StoreDriver={
  async read(){
    if(!storageReady())return {state:initialState(),etag:null};
    const result=await get(dataPath(),{access:'private',useCache:false});
    if(!result)return {state:initialState(),etag:null};
    if(!result.stream)throw new ApiError(503,'无法读取课程数据，请稍后重试');
    const input:unknown=await new Response(result.stream).json();
    try{return {state:parseState(input),etag:result.blob.etag};}catch{throw new ApiError(503,'已保存的课程数据格式异常，请联系管理员；系统没有覆盖原数据');}
  },
  async write(state,etag){
    if(!storageReady())throw new ApiError(503,'尚未连接 Vercel Blob，只能查看初始课程，修改无法保存');
    try{await put(dataPath(),JSON.stringify(state),{access:'private',addRandomSuffix:false,allowOverwrite:etag!==null,...(etag?{ifMatch:etag}:{}),contentType:'application/json',cacheControlMaxAge:60});}
    catch(e){if(e instanceof BlobPreconditionFailedError||(e instanceof Error&&['BlobAlreadyExistsError','BlobConflictError'].includes(e.name)))throw new ApiError(409,'课程数据刚被修改，请刷新后重试；本次更改未覆盖原数据');throw e;}
  }
};
export async function mutate<T>(operation:(state:State)=>T,driver:StoreDriver=blobDriver){const {state,etag}=await driver.read();const next=structuredClone(state);const result=operation(next);await driver.write(parseState(next),etag);return result;}
