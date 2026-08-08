import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, ChevronRight, FileText, X } from 'lucide-react';
import { roleFromValue } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type Report={id:string;date:string;generatedAt:string;recipientIds:string[];recipientNames:string[]};
function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function key(userId:string){return`hospicore.direction-reports.seen.${userId}`}
function loadSeen(userId:string){try{return new Set<string>(JSON.parse(localStorage.getItem(key(userId))||'[]'))}catch{return new Set<string>()}}
function saveSeen(userId:string,seen:Set<string>){try{localStorage.setItem(key(userId),JSON.stringify(Array.from(seen).slice(-730)))}catch{}}
export function DirectionReportNotificationHost(){
 const s=session(),u=s.user||{},userId=String(u.id||''),isDirection=roleFromValue(u.role)==='direction',store=useOperationalStore<Report[]>('direction-daily-reports',[],5000),[seen,setSeen]=useState<Set<string>>(()=>loadSeen(userId)),[toast,setToast]=useState<Report|null>(null),initialized=useRef(false);
 const assigned=useMemo(()=>isDirection?store.data.filter(r=>!r.recipientIds?.length||r.recipientIds.includes(userId)).sort((a,b)=>b.date.localeCompare(a.date)):[],[store.data,isDirection,userId]),unread=assigned.filter(r=>!seen.has(r.id));
 useEffect(()=>{if(!isDirection||store.state==='loading')return;if(!initialized.current){initialized.current=true;if(unread[0])setToast(unread[0]);return}if(unread[0])setToast(current=>current?.id===unread[0].id?current:unread[0])},[store.version,isDirection,unread.length]);
 useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(null),12000);return()=>window.clearTimeout(timer)},[toast?.id]);
 function mark(id:string){const next=new Set(seen);next.add(id);setSeen(next);saveSeen(userId,next);if(toast?.id===id)setToast(null)}
 if(!s.token||!userId||!isDirection)return null;
 return <>{toast&&<aside className="direction-report-toast"><FileText size={21}/><div><small>Rapport journalier Direction disponible</small><strong>{new Date(`${toast.date}T12:00:00`).toLocaleDateString('fr-FR')}</strong><span>Informations importantes de la journée et points d’attention pour demain.</span></div><button className="close" onClick={()=>mark(toast.id)}><X size={17}/></button><button className="open" onClick={()=>{mark(toast.id);location.href='/rapports-direction'}}>Ouvrir <ChevronRight size={15}/></button></aside>}<div className="direction-report-notification"><button title="Rapports Direction" onClick={()=>location.href='/rapports-direction'}><Bell size={18}/>{unread.length>0&&<b>{unread.length}</b>}</button></div></>;
}
