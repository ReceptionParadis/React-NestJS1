import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { loadSharedData, saveSharedData } from './operational-sync';

export type OperationalSyncState = 'loading' | 'synced' | 'saving' | 'error' | 'conflict';
export type OperationalStore<T> = {data:T;setData:Dispatch<SetStateAction<T>>;version:number;updatedAt:string;lastSuccessAt:string;state:OperationalSyncState;rawState:OperationalSyncState;rawMessage:string;message:string;refresh:(silent?:boolean)=>Promise<boolean>;save:(next:T)=>Promise<boolean>;saveImmediate:(next:T)=>Promise<boolean>};
export type OperationalChangeDetail = {namespace:string;version:number;at:number;source:'local'|'remote'};
type OperationalDraftDetail<T>={namespace:string;payload:T};
type PendingGroupWrite<T>={payload:T;revision:number};
type QueuedWrite<T>={payload:T;revision:number;successMessage:string;waiters:Array<(ok:boolean)=>void>};
const DEFAULT_REFRESH_MS=5_000;
const GROUP_360_SAVE_DELAY=650;
const GROUP_STATUS_ORDER:Record<string,number>={Préparation:0,Confirmé:1,Arrivé:2,'En séjour':3,Parti:4};
function emitOperationalChange(detail:OperationalChangeDetail){window.dispatchEvent(new CustomEvent<OperationalChangeDetail>('hospicore:operational-change',{detail}));}
function emitOperationalDraft<T>(detail:OperationalDraftDetail<T>){window.dispatchEvent(new CustomEvent<OperationalDraftDetail<T>>('hospicore:operational-draft',{detail}));}
function stableSignature(value:unknown){try{return JSON.stringify(value)}catch{return String(value)}}
function isRecord(value:unknown):value is Record<string,unknown>{return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)}
function mergeDraftValue(base:unknown,current:unknown,incoming:unknown):unknown{
 if(stableSignature(incoming)===stableSignature(base))return current;
 if(stableSignature(current)===stableSignature(base))return incoming;
 if(Array.isArray(base)&&Array.isArray(current)&&Array.isArray(incoming)&&base.length===current.length&&base.length===incoming.length){return incoming.map((value,index)=>mergeDraftValue(base[index],current[index],value));}
 if(isRecord(base)&&isRecord(current)&&isRecord(incoming)){
  const result:Record<string,unknown>={};
  const keys=new Set([...Object.keys(base),...Object.keys(current),...Object.keys(incoming)]);
  keys.forEach(key=>{result[key]=mergeDraftValue(base[key],current[key],incoming[key]);});
  return result;
 }
 return incoming;
}
function statusChanged(current:unknown,next:unknown){if(!Array.isArray(current)||!Array.isArray(next))return false;const before=new Map(current.filter(Boolean).map((item:any)=>[String(item.id),String(item.status||'')]));return next.some((item:any)=>item&&before.has(String(item.id))&&before.get(String(item.id))!==String(item.status||''));}
function preserveCompletedGroupControls(current:unknown,next:unknown){if(!Array.isArray(current)||!Array.isArray(next))return next;const before=new Map(current.filter(Boolean).map((item:any)=>[String(item.id),item]));return next.map((item:any)=>{if(!item?.id)return item;const previous:any=before.get(String(item.id));const priorControl=previous?.groupControl;if(!priorControl)return item;const completed=Boolean(priorControl.validatedAt||priorControl.printedAt||priorControl.locked);if(!completed)return item;if(item.groupControl===undefined||item.groupControl===null)return{...item,groupControl:priorControl};return item;});}
function preserveGroupWorkflow(current:unknown,next:unknown){
 if(!Array.isArray(current)||!Array.isArray(next))return next;
 const before=new Map(current.filter(Boolean).map((item:any)=>[String(item.id),item]));
 return next.map((item:any)=>{
  if(!item?.id)return item;
  const previous:any=before.get(String(item.id));
  if(!previous)return item;
  const previousStatus=String(previous.status||'');
  const nextStatus=String(item.status||'');
  const previousRank=GROUP_STATUS_ORDER[previousStatus];
  const nextRank=GROUP_STATUS_ORDER[nextStatus];
  let protectedItem=item;
  if(previousRank!==undefined&&(nextRank===undefined||nextRank<previousRank)){
   protectedItem={...protectedItem,status:previousStatus};
   if(previous.arrivalConfirmedAt&&!protectedItem.arrivalConfirmedAt)protectedItem.arrivalConfirmedAt=previous.arrivalConfirmedAt;
   if(previous.arrivalConfirmedBy&&!protectedItem.arrivalConfirmedBy)protectedItem.arrivalConfirmedBy=previous.arrivalConfirmedBy;
   if(previous.departureConfirmedAt&&!protectedItem.departureConfirmedAt)protectedItem.departureConfirmedAt=previous.departureConfirmedAt;
   if(previous.departureConfirmedBy&&!protectedItem.departureConfirmedBy)protectedItem.departureConfirmedBy=previous.departureConfirmedBy;
  }
  return protectedItem;
 });
}
function protectGroup360(current:unknown,next:unknown){return preserveGroupWorkflow(current,preserveCompletedGroupControls(current,next));}
function protectNamespace<T>(namespace:string,current:T,next:T):T{return(namespace==='group-360'?protectGroup360(current,next):next)as T;}

export function useOperationalStore<T>(namespace:string,initialValue:T,refreshMs=DEFAULT_REFRESH_MS):OperationalStore<T>{
 const initialValueRef=useRef(initialValue);
 const[data,setData]=useState<T>(()=>initialValueRef.current);
 const dataRef=useRef<T>(initialValueRef.current),serverPayloadRef=useRef<T>(initialValueRef.current),dataSignatureRef=useRef(stableSignature(initialValueRef.current));
 const[version,setVersion]=useState(0),versionRef=useRef(0),localRevisionRef=useRef(0),persistedRevisionRef=useRef(0);
 const refreshInFlightRef=useRef(false),writeInFlightRef=useRef(false),mountedRef=useRef(true),channelRef=useRef<BroadcastChannel|null>(null);
 const pendingPayloadRef=useRef<PendingGroupWrite<T>|null>(null),queuedWriteRef=useRef<QueuedWrite<T>|null>(null),saveTimerRef=useRef<number|null>(null),drainWritesRef=useRef<()=>Promise<void>>(async()=>{});
 const[updatedAt,setUpdatedAt]=useState(''),[lastSuccessAt,setLastSuccessAt]=useState(''),[state,setState]=useState<OperationalSyncState>('loading'),[message,setMessage]=useState('Connexion à PostgreSQL…');
 const applyPayload=useCallback((payload:T)=>{dataRef.current=payload;const signature=stableSignature(payload);if(signature===dataSignatureRef.current)return false;dataSignatureRef.current=signature;setData(payload);return true;},[]);
 const hasLocalWork=useCallback(()=>Boolean(pendingPayloadRef.current||queuedWriteRef.current||writeInFlightRef.current||localRevisionRef.current>persistedRevisionRef.current),[]);
 const stageLocal=useCallback((next:T)=>{
  const before=dataRef.current;
  const merged=mergeDraftValue(serverPayloadRef.current,before,next) as T;
  const protectedNext=protectNamespace(namespace,before,merged);
  const revision=localRevisionRef.current+1;
  localRevisionRef.current=revision;
  if(mountedRef.current){applyPayload(protectedNext);setState('synced');setMessage('Saisie conservée localement · synchronisation…');}
  emitOperationalDraft({namespace,payload:protectedNext});
  return{before,payload:protectedNext,revision};
 },[applyPayload,namespace]);
 const applyServerResult=useCallback((payload:T,nextVersion:number,successMessage:string,revision?:number)=>{
  if(!mountedRef.current)return;
  const successAt=new Date().toISOString();
  serverPayloadRef.current=payload;
  if(revision!==undefined)persistedRevisionRef.current=Math.max(persistedRevisionRef.current,revision);
  const newerLocal=localRevisionRef.current>persistedRevisionRef.current;
  if(!newerLocal){const protectedPayload=protectNamespace(namespace,dataRef.current,payload);applyPayload(protectedPayload);}
  setVersion(nextVersion);versionRef.current=nextVersion;setUpdatedAt(successAt);setLastSuccessAt(successAt);
  if(queuedWriteRef.current||pendingPayloadRef.current||writeInFlightRef.current&&newerLocal){setState('saving');setMessage('Synchronisation des dernières saisies…');}else{setState('synced');setMessage(successMessage);}
 },[applyPayload,namespace]);
 const refresh=useCallback(async(silent=false):Promise<boolean>=>{
  if(hasLocalWork())return true;
  if(refreshInFlightRef.current)return false;
  refreshInFlightRef.current=true;
  if(!silent&&mountedRef.current){setState('loading');setMessage('Synchronisation en cours…');}
  try{
   const previousVersion=versionRef.current,result=await loadSharedData<T>(namespace,initialValueRef.current);
   if(!mountedRef.current)return false;
   if(!result.connected){setState('error');setMessage(result.error||'Synchronisation PostgreSQL indisponible.');return false;}
   if(hasLocalWork())return true;
   serverPayloadRef.current=result.payload;
   const protectedPayload=protectNamespace(namespace,dataRef.current,result.payload);
   applyPayload(protectedPayload);setVersion(result.version);versionRef.current=result.version;
   const successAt=new Date().toISOString();setUpdatedAt(successAt);setLastSuccessAt(successAt);setState('synced');setMessage('Données partagées à jour');
   if(silent&&previousVersion>0&&result.version>previousVersion)emitOperationalChange({namespace,version:result.version,at:Date.now(),source:'remote'});
   return true;
  }catch(error){if(!mountedRef.current)return false;setState('error');setMessage(error instanceof Error?error.message:'Synchronisation PostgreSQL indisponible.');return false;}
  finally{refreshInFlightRef.current=false;}
 },[applyPayload,hasLocalWork,namespace]);
 const persistOnce=useCallback(async(payload:T,revision:number,successMessage:string):Promise<boolean>=>{
  const baseBeforeWrite=serverPayloadRef.current;
  try{
   let result;
   try{result=await saveSharedData<T>(namespace,payload,versionRef.current);}
   catch(firstError){
    const firstText=firstError instanceof Error?firstError.message:String(firstError);
    if(!firstText.includes('autre personne'))throw firstError;
    const latest=await loadSharedData<T>(namespace,initialValueRef.current);
    if(!latest.connected)throw firstError;
    serverPayloadRef.current=latest.payload;versionRef.current=latest.version;if(mountedRef.current)setVersion(latest.version);
    const rebased=protectNamespace(namespace,latest.payload,mergeDraftValue(baseBeforeWrite,latest.payload,payload) as T);
    result=await saveSharedData<T>(namespace,rebased,latest.version);
   }
   applyServerResult(result.payload,result.version,successMessage,revision);
   const detail:OperationalChangeDetail={namespace,version:result.version,at:Date.now(),source:'local'};
   emitOperationalChange(detail);channelRef.current?.postMessage(detail);return true;
  }catch(error){
   if(mountedRef.current){const text=error instanceof Error?error.message:'Enregistrement impossible.';const conflict=text.includes('autre personne');setState(conflict?'conflict':'error');setMessage(text);}
   return false;
  }
 },[applyServerResult,namespace]);
 const drainWrites=useCallback(async()=>{
  if(writeInFlightRef.current)return;
  writeInFlightRef.current=true;
  try{
   while(queuedWriteRef.current){
    const current=queuedWriteRef.current;queuedWriteRef.current=null;
    if(mountedRef.current){setState('saving');setMessage('Enregistrement partagé…');}
    const ok=await persistOnce(current.payload,current.revision,current.successMessage);
    current.waiters.forEach(resolve=>resolve(ok));
   }
  }finally{
   writeInFlightRef.current=false;
   if(queuedWriteRef.current)void drainWritesRef.current();
   else if(mountedRef.current&&localRevisionRef.current<=persistedRevisionRef.current){setState('synced');setMessage(namespace==='group-360'?'Fiche Groupe 360° enregistrée':'Enregistré pour tous les services');}
  }
 },[namespace,persistOnce]);
 drainWritesRef.current=drainWrites;
 const enqueueWrite=useCallback((payload:T,revision:number,successMessage:string):Promise<boolean>=>new Promise(resolve=>{
  const queued=queuedWriteRef.current;
  queuedWriteRef.current=queued?{payload,revision,successMessage,waiters:[...queued.waiters,resolve]}:{payload,revision,successMessage,waiters:[resolve]};
  void drainWritesRef.current();
 }),[]);
 const saveImmediate=useCallback(async(next:T):Promise<boolean>=>{
  if(namespace==='group-360'){if(saveTimerRef.current!==null){window.clearTimeout(saveTimerRef.current);saveTimerRef.current=null;}pendingPayloadRef.current=null;}
  const staged=stageLocal(next);
  return enqueueWrite(staged.payload,staged.revision,namespace==='group-360'?'Fiche Groupe 360° enregistrée':'Enregistré pour tous les services');
 },[enqueueWrite,namespace,stageLocal]);
 const save=useCallback(async(next:T):Promise<boolean>=>{
  const staged=stageLocal(next);
  if(namespace==='group-360'){
   if(statusChanged(staged.before,staged.payload))return enqueueWrite(staged.payload,staged.revision,'Fiche Groupe 360° enregistrée');
   pendingPayloadRef.current={payload:staged.payload,revision:staged.revision};
   if(saveTimerRef.current!==null)window.clearTimeout(saveTimerRef.current);
   saveTimerRef.current=window.setTimeout(()=>{
    const pending=pendingPayloadRef.current;if(!pending)return;
    pendingPayloadRef.current=null;saveTimerRef.current=null;
    void enqueueWrite(pending.payload,pending.revision,'Fiche Groupe 360° enregistrée');
   },GROUP_360_SAVE_DELAY);
   return true;
  }
  return enqueueWrite(staged.payload,staged.revision,'Enregistré pour tous les services');
 },[enqueueWrite,namespace,stageLocal]);
 useEffect(()=>{
  mountedRef.current=true;void refresh();
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh(true);},Math.max(5_000,refreshMs));
  const refreshWhenActive=()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh(true);};
  const refreshOnOperationalChange=(event:Event)=>{const detail=(event as CustomEvent<OperationalChangeDetail>).detail;if(detail?.namespace===namespace&&detail.version>versionRef.current)void refresh(true);};
  const applyOperationalDraft=(event:Event)=>{const detail=(event as CustomEvent<OperationalDraftDetail<T>>).detail;if(detail?.namespace!==namespace)return;if(mountedRef.current){const merged=mergeDraftValue(serverPayloadRef.current,dataRef.current,detail.payload) as T;applyPayload(protectNamespace(namespace,dataRef.current,merged));}};
  window.addEventListener('focus',refreshWhenActive);window.addEventListener('online',refreshWhenActive);window.addEventListener('hospicore:operational-change',refreshOnOperationalChange as EventListener);window.addEventListener('hospicore:operational-draft',applyOperationalDraft as EventListener);document.addEventListener('visibilitychange',refreshWhenActive);
  if('BroadcastChannel'in window){const channel=new BroadcastChannel(`hospicore-sync-${namespace}`);channelRef.current=channel;channel.onmessage=(event:MessageEvent<OperationalChangeDetail>)=>{if(!event.data?.version||event.data.version>versionRef.current)void refresh(true);};}
  return()=>{mountedRef.current=false;window.clearInterval(timer);if(saveTimerRef.current!==null)window.clearTimeout(saveTimerRef.current);window.removeEventListener('focus',refreshWhenActive);window.removeEventListener('online',refreshWhenActive);window.removeEventListener('hospicore:operational-change',refreshOnOperationalChange as EventListener);window.removeEventListener('hospicore:operational-draft',applyOperationalDraft as EventListener);document.removeEventListener('visibilitychange',refreshWhenActive);channelRef.current?.close();channelRef.current=null;};
 },[applyPayload,namespace,refresh,refreshMs]);
 const publicMessage=state==='synced'?(message.startsWith('Saisie')||message.startsWith('Fiche Groupe')||message.startsWith('Enregistré')?message:lastSuccessAt?`PostgreSQL à jour · ${new Date(lastSuccessAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:'Données opérationnelles disponibles'):message;
 return{data,setData,version,updatedAt,lastSuccessAt,state,rawState:state,rawMessage:message,message:publicMessage,refresh,save,saveImmediate};
}
