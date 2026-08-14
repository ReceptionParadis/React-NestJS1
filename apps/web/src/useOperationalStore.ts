import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { loadSharedData, saveSharedData } from './operational-sync';

export type OperationalSyncState = 'loading' | 'synced' | 'saving' | 'error' | 'conflict';
export type OperationalStore<T> = {data:T;setData:Dispatch<SetStateAction<T>>;version:number;updatedAt:string;lastSuccessAt:string;state:OperationalSyncState;rawState:OperationalSyncState;rawMessage:string;message:string;refresh:(silent?:boolean)=>Promise<boolean>;save:(next:T)=>Promise<boolean>;saveImmediate:(next:T)=>Promise<boolean>};
export type OperationalChangeDetail = {namespace:string;version:number;at:number;source:'local'|'remote'};
type OperationalDraftDetail<T>={namespace:string;payload:T};
const DEFAULT_REFRESH_MS=5_000;
const GROUP_360_SAVE_DELAY=650;
let group360PendingPayload:unknown=null;
let group360SaveTimer:number|null=null;
function emitOperationalChange(detail:OperationalChangeDetail){window.dispatchEvent(new CustomEvent<OperationalChangeDetail>('hospicore:operational-change',{detail}));}
function emitOperationalDraft<T>(detail:OperationalDraftDetail<T>){window.dispatchEvent(new CustomEvent<OperationalDraftDetail<T>>('hospicore:operational-draft',{detail}));}
function stableSignature(value:unknown){try{return JSON.stringify(value)}catch{return String(value)}}
function statusChanged(current:unknown,next:unknown){
 if(!Array.isArray(current)||!Array.isArray(next))return false;
 const before=new Map(current.filter(Boolean).map((item:any)=>[String(item.id),String(item.status||'')]));
 return next.some((item:any)=>item&&before.has(String(item.id))&&before.get(String(item.id))!==String(item.status||''));
}
function preserveCompletedGroupControls(current:unknown,next:unknown){
 if(!Array.isArray(current)||!Array.isArray(next))return next;
 const before=new Map(current.filter(Boolean).map((item:any)=>[String(item.id),item]));
 return next.map((item:any)=>{
  if(!item?.id)return item;
  const previous:any=before.get(String(item.id));
  const priorControl=previous?.groupControl;
  if(!priorControl)return item;
  const completed=Boolean(priorControl.validatedAt||priorControl.printedAt||priorControl.locked);
  if(!completed)return item;
  // Une vue métier qui ne connaît pas groupControl ne doit jamais effacer un contrôle déjà réalisé.
  if(item.groupControl===undefined||item.groupControl===null)return{...item,groupControl:priorControl};
  return item;
 });
}

export function useOperationalStore<T>(namespace:string,initialValue:T,refreshMs=DEFAULT_REFRESH_MS):OperationalStore<T>{
 const initialValueRef=useRef(initialValue),[data,setData]=useState<T>(()=>initialValueRef.current),dataRef=useRef<T>(initialValueRef.current),dataSignatureRef=useRef(stableSignature(initialValueRef.current)),[version,setVersion]=useState(0),versionRef=useRef(0),refreshInFlightRef=useRef(false),writeEpochRef=useRef(0),mountedRef=useRef(true),channelRef=useRef<BroadcastChannel|null>(null),[updatedAt,setUpdatedAt]=useState(''),[lastSuccessAt,setLastSuccessAt]=useState(''),[state,setState]=useState<OperationalSyncState>('loading'),[message,setMessage]=useState('Connexion à PostgreSQL…');
 const applyPayload=useCallback((payload:T)=>{dataRef.current=payload;const signature=stableSignature(payload);if(signature===dataSignatureRef.current)return false;dataSignatureRef.current=signature;setData(payload);return true;},[]);
 const markSuccess=useCallback((payload:T,nextVersion:number,successMessage:string)=>{if(!mountedRef.current)return;const successAt=new Date().toISOString();applyPayload(payload);setVersion(nextVersion);versionRef.current=nextVersion;setUpdatedAt(successAt);setLastSuccessAt(successAt);setState('synced');setMessage(successMessage);},[applyPayload]);
 const refresh=useCallback(async(silent=false):Promise<boolean>=>{if(namespace==='group-360'&&group360PendingPayload!==null)return true;if(refreshInFlightRef.current)return false;refreshInFlightRef.current=true;const readEpoch=writeEpochRef.current;if(!silent&&mountedRef.current){setState('loading');setMessage('Synchronisation en cours…');}try{const previousVersion=versionRef.current,result=await loadSharedData<T>(namespace,initialValueRef.current);if(!mountedRef.current)return false;if(!result.connected){setState('error');setMessage(result.error||'Synchronisation PostgreSQL indisponible.');return false;}if(readEpoch!==writeEpochRef.current)return true;markSuccess(result.payload,result.version,'Données partagées à jour');if(silent&&previousVersion>0&&result.version>previousVersion)emitOperationalChange({namespace,version:result.version,at:Date.now(),source:'remote'});return true;}catch(error){if(!mountedRef.current)return false;setState('error');setMessage(error instanceof Error?error.message:'Synchronisation PostgreSQL indisponible.');return false;}finally{refreshInFlightRef.current=false;}},[markSuccess,namespace]);
 const persist=useCallback(async(next:T,successMessage:string):Promise<boolean>=>{writeEpochRef.current+=1;const protectedNext=(namespace==='group-360'?preserveCompletedGroupControls(dataRef.current,next):next) as T;if(mountedRef.current){applyPayload(protectedNext);setState('saving');setMessage('Enregistrement partagé…');}emitOperationalDraft({namespace,payload:protectedNext});try{const result=await saveSharedData<T>(namespace,protectedNext,versionRef.current);if(!mountedRef.current)return false;markSuccess(result.payload,result.version,successMessage);const detail:OperationalChangeDetail={namespace,version:result.version,at:Date.now(),source:'local'};emitOperationalChange(detail);channelRef.current?.postMessage(detail);return true;}catch(error){if(!mountedRef.current)return false;const text=error instanceof Error?error.message:'Enregistrement impossible.';const conflict=text.includes('autre personne');setState(conflict?'conflict':'error');setMessage(text);if(conflict)window.setTimeout(()=>void refresh(true),250);return false;}},[applyPayload,markSuccess,namespace,refresh]);
 const saveImmediate=useCallback(async(next:T):Promise<boolean>=>{if(namespace==='group-360'){if(group360SaveTimer!==null){window.clearTimeout(group360SaveTimer);group360SaveTimer=null;}group360PendingPayload=null;}return persist(next,namespace==='group-360'?'Fiche Groupe 360° enregistrée':'Enregistré pour tous les services');},[namespace,persist]);
 const save=useCallback(async(next:T):Promise<boolean>=>{
  if(namespace==='group-360'){
   const protectedNext=preserveCompletedGroupControls(dataRef.current,next) as T;
   if(statusChanged(dataRef.current,protectedNext))return saveImmediate(protectedNext);
   group360PendingPayload=protectedNext;
   if(mountedRef.current){applyPayload(protectedNext);setState('synced');setMessage('Saisie enregistrée automatiquement…');}
   emitOperationalDraft({namespace,payload:protectedNext});
   if(group360SaveTimer!==null)window.clearTimeout(group360SaveTimer);
   group360SaveTimer=window.setTimeout(async()=>{const payload=group360PendingPayload as T|null;if(payload===null)return;group360PendingPayload=null;group360SaveTimer=null;await persist(payload,'Fiche Groupe 360° enregistrée');},GROUP_360_SAVE_DELAY);
   return true;
  }
  return persist(next,'Enregistré pour tous les services');
 },[applyPayload,namespace,persist,saveImmediate]);
 useEffect(()=>{mountedRef.current=true;void refresh();const timer=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh(true);},Math.max(5_000,refreshMs));const refreshWhenActive=()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh(true);};const refreshOnOperationalChange=(event:Event)=>{const detail=(event as CustomEvent<OperationalChangeDetail>).detail;if(detail?.namespace===namespace&&detail.version>versionRef.current)void refresh(true);};const applyOperationalDraft=(event:Event)=>{const detail=(event as CustomEvent<OperationalDraftDetail<T>>).detail;if(detail?.namespace!==namespace)return;if(mountedRef.current){const protectedPayload=(namespace==='group-360'?preserveCompletedGroupControls(dataRef.current,detail.payload):detail.payload) as T;applyPayload(protectedPayload);if(namespace==='group-360'){setState('synced');setMessage('Saisie enregistrée automatiquement…');}}};window.addEventListener('focus',refreshWhenActive);window.addEventListener('online',refreshWhenActive);window.addEventListener('hospicore:operational-change',refreshOnOperationalChange as EventListener);window.addEventListener('hospicore:operational-draft',applyOperationalDraft as EventListener);document.addEventListener('visibilitychange',refreshWhenActive);if('BroadcastChannel'in window){const channel=new BroadcastChannel(`hospicore-sync-${namespace}`);channelRef.current=channel;channel.onmessage=(event:MessageEvent<OperationalChangeDetail>)=>{if(!event.data?.version||event.data.version>versionRef.current)void refresh(true);};}return()=>{mountedRef.current=false;window.clearInterval(timer);window.removeEventListener('focus',refreshWhenActive);window.removeEventListener('online',refreshWhenActive);window.removeEventListener('hospicore:operational-change',refreshOnOperationalChange as EventListener);window.removeEventListener('hospicore:operational-draft',applyOperationalDraft as EventListener);document.removeEventListener('visibilitychange',refreshWhenActive);channelRef.current?.close();channelRef.current=null;};},[applyPayload,namespace,refresh,refreshMs]);
 const publicMessage=state==='synced'?(message.startsWith('Saisie enregistrée')||message.startsWith('Fiche Groupe')?message:lastSuccessAt?`PostgreSQL à jour · ${new Date(lastSuccessAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:'Données opérationnelles disponibles'):message;
 return{data,setData,version,updatedAt,lastSuccessAt,state,rawState:state,rawMessage:message,message:publicMessage,refresh,save,saveImmediate};
}
