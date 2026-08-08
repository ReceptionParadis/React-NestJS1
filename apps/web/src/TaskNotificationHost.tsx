import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type Task={id:string;reference?:string;title:string;service:string;assignee?:string;assigneeId?:string;assignmentType?:'user'|'service';status:string;priority?:string;dueAt?:string;createdAt?:string};
function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function serviceForRole(value:string){const r=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(r.includes('direction')||r.includes('directeur')||r.includes('admin'))return'Direction';if(r.includes('commercial')||r.includes('vente'))return'Commercial';if(r.includes('maintenance')||r.includes('tech'))return'Maintenance';return'Réception'}
function storageKey(userId:string){return`hospicore.tasks.seen.${userId}`}
function loadSeen(userId:string){try{return new Set<string>(JSON.parse(localStorage.getItem(storageKey(userId))||'[]'))}catch{return new Set<string>()}}
function saveSeen(userId:string,value:Set<string>){try{localStorage.setItem(storageKey(userId),JSON.stringify(Array.from(value).slice(-500)))}catch{}}

export function TaskNotificationHost(){
 const store=useOperationalStore<Task[]>('tasks',[],5000),[open,setOpen]=useState(false),s=session(),u=s.user||{},userId=String(u.id||''),service=serviceForRole(String(u.role?.baseRole||u.role?.name||u.role||''));
 const [seen,setSeen]=useState<Set<string>>(()=>loadSeen(userId)),[toast,setToast]=useState<Task|null>(null),initialized=useRef(false);
 const assigned=useMemo(()=>store.data.filter(t=>t.status!=='Terminée'&&((t.assignmentType==='user'||t.assigneeId)?t.assigneeId===userId:t.service===service)).sort((a,b)=>(a.dueAt||'').localeCompare(b.dueAt||'')),[store.data,userId,service]);
 const unread=useMemo(()=>assigned.filter(t=>!seen.has(t.id)),[assigned,seen]);
 useEffect(()=>{if(!userId||store.state==='loading')return;if(!initialized.current){initialized.current=true;if(unread[0])setToast(unread[0]);return}if(unread[0])setToast(current=>current?.id===unread[0].id?current:unread[0])},[store.version,userId,unread.length]);
 useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(null),9000);return()=>window.clearTimeout(timer)},[toast?.id]);
 function markSeen(id:string){const next=new Set(seen);next.add(id);setSeen(next);saveSeen(userId,next);if(toast?.id===id)setToast(null)}
 function markAllSeen(){const next=new Set(seen);assigned.forEach(t=>next.add(t.id));setSeen(next);saveSeen(userId,next);setToast(null)}
 if(!s.token||!userId)return null;
 return <>
  {toast&&<aside className={`task-notification-toast ${String(toast.priority||'Normale').toLowerCase()}`} role="status"><div className="task-notification-toast-icon"><Bell size={20}/></div><div className="task-notification-toast-content"><small>Nouvelle tâche{toast.reference?` · ${toast.reference}`:''}</small><strong>{toast.title}</strong><span>{toast.assignmentType==='service'?`Assignée au service ${toast.service}`:'Assignée directement à vous'}{toast.dueAt?` · échéance ${new Date(toast.dueAt).toLocaleString('fr-FR')}`:''}</span></div><button className="task-notification-toast-close" onClick={()=>markSeen(toast.id)} aria-label="Marquer comme lue"><X size={17}/></button><button className="task-notification-toast-open" onClick={()=>{markSeen(toast.id);location.href='/taches'}}>Voir la tâche <ChevronRight size={15}/></button></aside>}
  <div className="task-notification-host"><button className="task-notification-bell" onClick={()=>setOpen(v=>!v)} title="Mes tâches"><Bell size={19}/>{unread.length>0&&<b>{unread.length>99?'99+':unread.length}</b>}</button>{open&&<aside className="task-notification-panel"><header><div><strong>Mes tâches</strong><small>{unread.length} non lue{unread.length>1?'s':''} · {assigned.length} active{assigned.length>1?'s':''}</small></div><button onClick={()=>setOpen(false)}><X size={17}/></button></header><div>{assigned.length?assigned.slice(0,12).map(t=><button className={`task-notification-item ${seen.has(t.id)?'seen':'unread'}`} key={t.id} onClick={()=>{markSeen(t.id);location.href='/taches'}}><span className={`task-notification-priority ${String(t.priority||'Normale').toLowerCase()}`}/><div><strong>{t.title}</strong><small>{t.assignmentType==='service'?`Service ${t.service}`:t.assignee||'Tâche personnelle'}{t.dueAt?` · échéance ${new Date(t.dueAt).toLocaleString('fr-FR')}`:''}</small></div>{seen.has(t.id)?<Check size={15}/>:<Bell size={15}/>}</button>):<p className="task-notification-empty"><CheckCircle2 size={18}/>Aucune tâche active.</p>}</div><footer>{unread.length>0&&<button className="task-notification-readall" onClick={markAllSeen}><Check size={15}/>Tout marquer comme lu</button>}<button onClick={()=>location.href='/taches'}>Ouvrir Mes tâches</button></footer></aside>}</div>
 </>;
}
