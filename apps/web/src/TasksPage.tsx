import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, CheckCircle2, Cloud, CloudOff, Clock3, MessageSquarePlus, Plus, RefreshCw, Search, UserRound, X } from 'lucide-react';
import { loadSharedData, saveSharedData } from './operational-sync';

type TaskStatus = 'À faire' | 'En cours' | 'En attente' | 'Terminée';
type Priority = 'Faible' | 'Normale' | 'Haute' | 'Critique';
type HistoryEntry = { id:string; action:string; actor:string; role:string; at:string; comment?:string };
type Task = { id:string; reference:string; title:string; description:string; service:string; assignee:string; priority:Priority; status:TaskStatus; dueAt:string; linkedTo:string; history:HistoryEntry[] };
type SyncState = 'loading' | 'synced' | 'saving' | 'offline' | 'conflict';

const KEY='hospicore.tasks.v1';
const NAMESPACE='tasks';
const columns:TaskStatus[]=['À faire','En cours','En attente','Terminée'];
const demo:Task[]=[
 {id:'t1',reference:'T-2026-000154',title:'Préparer salle Gavarnie',description:'Disposition théâtre, eau et paperboard.',service:'Restaurant',assignee:'Gabriel Martin',priority:'Haute',status:'À faire',dueAt:'2026-08-06T14:30',linkedTo:'Groupe ORP',history:[{id:'h1',action:'Tâche créée',actor:'Thomas PETRISSANS',role:'Directeur Hébergement',at:'05/08/2026 22:58:12'}]},
 {id:'t2',reference:'T-2026-000155',title:'Installer un lit bébé',description:'Installation avant arrivée du client.',service:'Housekeeping',assignee:'Noémie Dupont',priority:'Normale',status:'En cours',dueAt:'2026-08-06T16:00',linkedTo:'Chambre 315',history:[{id:'h2',action:'Tâche prise en charge',actor:'Noémie Dupont',role:'Housekeeping',at:'05/08/2026 23:01:04'}]},
];
function currentUser(){try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}');const u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:u.role||'Collaborateur'};}catch{return{name:'Utilisateur HospiCore',role:'Collaborateur'};}}
function stamp(){return new Date().toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function loadLocal():Task[]{try{return JSON.parse(localStorage.getItem(KEY)||'null')||demo;}catch{return demo;}}
function saveLocal(items:Task[]){localStorage.setItem(KEY,JSON.stringify(items));window.dispatchEvent(new CustomEvent('hospicore:tasks'));}

export function TasksPage(){
 const [items,setItems]=useState<Task[]>(loadLocal);const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const [service,setService]=useState('Tous');const [commentTask,setCommentTask]=useState<Task|null>(null);
 const [version,setVersion]=useState(0);const [syncState,setSyncState]=useState<SyncState>('loading');const [syncMessage,setSyncMessage]=useState('Connexion à PostgreSQL…');const [updatedAt,setUpdatedAt]=useState('');
 const services=['Tous','Réception','Housekeeping','Restaurant','Cuisine','Maintenance','Commercial','Direction'];
 const filtered=useMemo(()=>items.filter(t=>(service==='Tous'||t.service===service)&&`${t.reference} ${t.title} ${t.description} ${t.assignee} ${t.linkedTo}`.toLowerCase().includes(query.toLowerCase())),[items,query,service]);

 async function refresh(){
  setSyncState('loading');setSyncMessage('Synchronisation en cours…');
  const envelope=await loadSharedData<Task[]>(NAMESPACE,loadLocal());
  setItems(envelope.payload);saveLocal(envelope.payload);setVersion(envelope.version);setUpdatedAt(envelope.updatedAt);
  if(envelope.version===0){setSyncState('offline');setSyncMessage('Mode local — migration PostgreSQL à finaliser');}
  else{setSyncState('synced');setSyncMessage('Données partagées à jour');}
 }
 useEffect(()=>{void refresh();const timer=window.setInterval(()=>void refresh(),30000);return()=>window.clearInterval(timer);},[]);

 async function commit(next:Task[]){
  saveLocal(next);setItems(next);setSyncState('saving');setSyncMessage('Enregistrement partagé…');
  try{const envelope=await saveSharedData<Task[]>(NAMESPACE,next,version);setItems(envelope.payload);saveLocal(envelope.payload);setVersion(envelope.version);setUpdatedAt(envelope.updatedAt);setSyncState('synced');setSyncMessage('Enregistré pour tous les services');return true;}
  catch(error){const message=error instanceof Error?error.message:'Synchronisation impossible.';setSyncState(message.includes('autre personne')?'conflict':'offline');setSyncMessage(message);return false;}
 }
 async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const u=currentUser();const v:Task={id:crypto.randomUUID(),reference:`T-${new Date().getFullYear()}-${String(items.length+156).padStart(6,'0')}`,title:String(f.get('title')||''),description:String(f.get('description')||''),service:String(f.get('service')||''),assignee:String(f.get('assignee')||''),priority:String(f.get('priority')) as Priority,status:'À faire',dueAt:String(f.get('dueAt')||''),linkedTo:String(f.get('linkedTo')||''),history:[{id:crypto.randomUUID(),action:'Tâche créée',actor:u.name,role:u.role,at:stamp()}]};const ok=await commit([v,...items]);if(ok)setOpen(false);}
 async function move(id:string,status:TaskStatus,comment=''){const u=currentUser();const n=items.map(t=>t.id===id?{...t,status,history:[...t.history,{id:crypto.randomUUID(),action:`Statut modifié : ${status}`,actor:u.name,role:u.role,at:stamp(),comment:comment||undefined}]}:t);const ok=await commit(n);if(ok)setCommentTask(null);}
 const SyncIcon=syncState==='synced'?Cloud:syncState==='offline'||syncState==='conflict'?CloudOff:RefreshCw;
 return <div className="tasks-page"><header className="tasks-header"><div><button onClick={()=>location.href='/'}><ArrowLeft size={18}/>Tableau de bord</button><p>HospiCore · Coordination interservice</p><h1>Tâches</h1><span>Créez, attribuez et suivez les actions de chaque service.</span></div><div className="tasks-header-actions"><div className={`tasks-sync ${syncState}`}><SyncIcon size={17}/><div><strong>{syncMessage}</strong>{updatedAt&&<small>Dernière mise à jour : {new Date(updatedAt).toLocaleString('fr-FR')}</small>}</div>{(syncState==='offline'||syncState==='conflict')&&<button onClick={()=>void refresh()}><RefreshCw size={15}/>Recharger</button>}</div><button className="tasks-primary" onClick={()=>setOpen(true)}><Plus size={18}/>Nouvelle tâche</button></div></header>
 <section className="tasks-kpis"><article><Clock3/><span>À faire</span><strong>{items.filter(t=>t.status==='À faire').length}</strong></article><article><CalendarClock/><span>En cours</span><strong>{items.filter(t=>t.status==='En cours').length}</strong></article><article><CheckCircle2/><span>Terminées</span><strong>{items.filter(t=>t.status==='Terminée').length}</strong></article></section>
 <div className="tasks-toolbar"><label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une tâche…"/></label><select value={service} onChange={e=>setService(e.target.value)}>{services.map(s=><option key={s}>{s}</option>)}</select></div>
 <section className="tasks-board">{columns.map(col=><div className="task-column" key={col}><header><h2>{col}</h2><span>{filtered.filter(t=>t.status===col).length}</span></header>{filtered.filter(t=>t.status===col).map(t=><article className="task-card" key={t.id}><div className="task-card-top"><span className={`task-priority ${t.priority.toLowerCase()}`}>{t.priority}</span><small>{t.reference}</small></div><h3>{t.title}</h3><p>{t.description}</p><div className="task-meta"><span><UserRound size={14}/>{t.assignee||'Non attribuée'}</span><span><Clock3 size={14}/>{t.dueAt.replace('T',' ')}</span><span>{t.service}</span>{t.linkedTo&&<span>{t.linkedTo}</span>}</div><div className="task-actions">{col!=='En cours'&&col!=='Terminée'&&<button disabled={syncState==='saving'} onClick={()=>void move(t.id,'En cours')}>Démarrer</button>}{col==='En cours'&&<button disabled={syncState==='saving'} onClick={()=>void move(t.id,'En attente')}>Mettre en attente</button>}{col!=='Terminée'&&<button disabled={syncState==='saving'} onClick={()=>setCommentTask(t)}><CheckCircle2 size={15}/>Terminer</button>}</div><details><summary>Historique signé</summary>{t.history.map(h=><div className="task-history" key={h.id}><strong>{h.action}</strong><small>{h.actor} · {h.role} · {h.at}</small>{h.comment&&<p>{h.comment}</p>}</div>)}</details></article>)}</div>)}</section>
 {open&&<div className="tasks-modal"><form onSubmit={e=>void create(e)}><header><div><p>Nouvelle action</p><h2>Créer une tâche</h2></div><button type="button" onClick={()=>setOpen(false)}><X/></button></header><div className="tasks-form"><label className="wide">Titre<input name="title" required/></label><label>Service<select name="service">{services.slice(1).map(s=><option key={s}>{s}</option>)}</select></label><label>Assigné à<input name="assignee"/></label><label>Priorité<select name="priority"><option>Faible</option><option>Normale</option><option>Haute</option><option>Critique</option></select></label><label>Échéance<input type="datetime-local" name="dueAt" required/></label><label className="wide">Lié à<input name="linkedTo" placeholder="Groupe, chambre, salle…"/></label><label className="wide">Description<textarea name="description" required/></label></div><footer><button type="button" onClick={()=>setOpen(false)}>Annuler</button><button className="tasks-primary" disabled={syncState==='saving'} type="submit">Créer et synchroniser</button></footer></form></div>}
 {commentTask&&<div className="tasks-modal"><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void move(commentTask.id,'Terminée',String(f.get('comment')||''));}}><header><div><p>Clôture</p><h2>Terminer la tâche</h2></div><button type="button" onClick={()=>setCommentTask(null)}><X/></button></header><label className="task-comment"><MessageSquarePlus size={18}/>Commentaire de clôture<textarea name="comment" required/></label><footer><button type="button" onClick={()=>setCommentTask(null)}>Annuler</button><button className="tasks-primary" disabled={syncState==='saving'} type="submit">Terminer et synchroniser</button></footer></form></div>}
 </div>;
}
