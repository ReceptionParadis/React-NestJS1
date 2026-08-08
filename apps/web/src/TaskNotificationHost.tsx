import { useMemo, useState } from 'react';
import { Bell, CheckCircle2, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type Task={id:string;title:string;service:string;assignee?:string;assigneeId?:string;assignmentType?:'user'|'service';status:string;priority?:string;dueAt?:string};
function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function serviceForRole(value:string){const r=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(r.includes('direction')||r.includes('directeur')||r.includes('admin'))return'Direction';if(r.includes('commercial')||r.includes('vente'))return'Commercial';if(r.includes('maintenance')||r.includes('tech'))return'Maintenance';return'Réception'}
export function TaskNotificationHost(){
 const store=useOperationalStore<Task[]>('tasks',[],5000),[open,setOpen]=useState(false),s=session(),u=s.user||{},userId=String(u.id||''),service=serviceForRole(String(u.role?.baseRole||u.role?.name||u.role||''));
 const assigned=useMemo(()=>store.data.filter(t=>t.status!=='Terminée'&&((t.assignmentType==='user'||t.assigneeId)?t.assigneeId===userId:t.service===service)).sort((a,b)=>(a.dueAt||'').localeCompare(b.dueAt||'')),[store.data,userId,service]);
 if(!s.token||!userId)return null;
 return <div className="task-notification-host"><button className="task-notification-bell" onClick={()=>setOpen(v=>!v)} title="Mes tâches"><Bell size={19}/>{assigned.length>0&&<b>{assigned.length>99?'99+':assigned.length}</b>}</button>{open&&<aside className="task-notification-panel"><header><div><strong>Mes tâches</strong><small>{assigned.length} notification{assigned.length>1?'s':''} active{assigned.length>1?'s':''}</small></div><button onClick={()=>setOpen(false)}><X size={17}/></button></header><div>{assigned.length?assigned.slice(0,8).map(t=><button className="task-notification-item" key={t.id} onClick={()=>location.href='/taches'}><span className={`task-notification-priority ${String(t.priority||'Normale').toLowerCase()}`}/><div><strong>{t.title}</strong><small>{t.assignee||t.service}{t.dueAt?` · échéance ${t.dueAt.replace('T',' ')}`:''}</small></div></button>):<p className="task-notification-empty"><CheckCircle2 size={18}/>Aucune tâche active.</p>}</div><footer><button onClick={()=>location.href='/taches'}>Ouvrir Mes tâches</button></footer></aside>}</div>;
}
