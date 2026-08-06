import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Clock3, Filter, LockKeyhole, MapPin, Plus, Search, Send, UserRound, Wrench, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type MaintenanceStatus='À traiter'|'En cours'|'En attente de pièce'|'Terminée';
type MaintenancePriority='Basse'|'Normale'|'Haute'|'Urgente';
type RoomState='Libre'|'Occupée'|'Bloquée';
type HistoryEntry={id:string;action:string;actor:string;role:string;at:string;note?:string};
type Intervention={
 id:string;reference:string;title:string;description:string;status:MaintenanceStatus;priority:MaintenancePriority;
 building:'A'|'B'|'Zone commune';floor:string;room:string;area:string;roomState:RoomState;blocked:boolean;
 assignee:string;requester:string;requesterRole:string;createdAt:string;updatedAt:string;dueAt:string;
 beforePhoto:string;afterPhoto:string;resolution:string;returnedToServiceAt:string;returnedToServiceBy:string;
 history:HistoryEntry[];
};
type SessionUser={name:string;role:string};

const statuses:MaintenanceStatus[]=['À traiter','En cours','En attente de pièce','Terminée'];
const priorities:MaintenancePriority[]=['Basse','Normale','Haute','Urgente'];
const initial:Intervention[]=[];

function user():SessionUser{try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}');const u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:String(u.role?.name||u.role||'Collaborateur')}}catch{return{name:'Utilisateur HospiCore',role:'Collaborateur'}}}
function now(){return new Date().toLocaleString('fr-FR')}
function ref(){const d=new Date();return`MT-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getTime()).slice(-5)}`}
function priorityClass(value:MaintenancePriority){return value==='Urgente'?'critical':value==='Haute'?'high':value==='Normale'?'normal':'low'}
function locationLabel(item:Intervention){if(item.room)return`Bâtiment ${item.building} · étage ${item.floor||'—'} · chambre ${item.room}`;return item.area||`Bâtiment ${item.building}`}

export function TicketsPage(){
 const store=useOperationalStore<Intervention[]>('maintenance-interventions',initial);
 const current=user();
 const [selectedId,setSelectedId]=useState('');
 const [search,setSearch]=useState('');
 const [priority,setPriority]=useState<'Toutes'|MaintenancePriority>('Toutes');
 const [createOpen,setCreateOpen]=useState(false);
 const [comment,setComment]=useState('');
 const interventions=store.data;
 const filtered=useMemo(()=>interventions.filter(item=>(priority==='Toutes'||item.priority===priority)&&`${item.reference} ${item.title} ${item.description} ${item.room} ${item.area} ${item.assignee}`.toLowerCase().includes(search.toLowerCase())),[interventions,priority,search]);
 const selected=interventions.find(item=>item.id===selectedId)||filtered[0];

 async function save(updated:Intervention,action:string,note=''){
  const entry:HistoryEntry={id:crypto.randomUUID(),action,actor:current.name,role:current.role,at:now(),note};
  const final={...updated,updatedAt:now(),history:[...(updated.history||[]),entry]};
  await store.save(interventions.map(item=>item.id===final.id?final:item));
  setSelectedId(final.id);
 }
 async function patch(update:Partial<Intervention>,action:string){if(selected)await save({...selected,...update},action)}
 async function create(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=new FormData(event.currentTarget);const blocked=form.get('blocked')==='on';const created=now();
  const item:Intervention={id:crypto.randomUUID(),reference:ref(),title:String(form.get('title')||''),description:String(form.get('description')||''),status:'À traiter',priority:String(form.get('priority')||'Normale') as MaintenancePriority,building:String(form.get('building')||'A') as Intervention['building'],floor:String(form.get('floor')||''),room:String(form.get('room')||''),area:String(form.get('area')||''),roomState:blocked?'Bloquée':String(form.get('roomState')||'Libre') as RoomState,blocked,assignee:String(form.get('assignee')||'Maintenance'),requester:current.name,requesterRole:current.role,createdAt:created,updatedAt:created,dueAt:String(form.get('dueAt')||''),beforePhoto:String(form.get('beforePhoto')||''),afterPhoto:'',resolution:'',returnedToServiceAt:'',returnedToServiceBy:'',history:[{id:crypto.randomUUID(),action:'Intervention créée',actor:current.name,role:current.role,at:created}]};
  if(!item.title.trim()||!item.description.trim())return;
  if(await store.save([item,...interventions])){setSelectedId(item.id);setCreateOpen(false)}
 }
 async function addComment(){const text=comment.trim();if(!selected||!text)return;await save(selected,'Commentaire ajouté',text);setComment('')}
 async function changeStatus(status:MaintenanceStatus){
  if(!selected)return;
  const update:Partial<Intervention>={status};
  if(status==='Terminée'&&selected.blocked){update.resolution=selected.resolution||''}
  await patch(update,`Statut passé à « ${status} »`);
 }
 async function returnToService(){if(!selected||selected.status!=='Terminée'||!selected.resolution.trim())return;await save({...selected,blocked:false,roomState:'Libre',returnedToServiceAt:now(),returnedToServiceBy:current.name},'Chambre / zone remise en service')}

 return <div className="tickets-page maintenance-page">
  <header className="tickets-header"><div><a className="back-link" href="/"><ArrowLeft size={18}/>Centre de Commandement</a><p className="eyebrow">GMAO opérationnelle</p><h1>Maintenance</h1><p className="tickets-subtitle">Suivi des pannes, chambres bloquées et remises en service.</p></div><button className="primary-button" onClick={()=>setCreateOpen(true)}><Plus size={17}/>Nouvelle intervention</button></header>
  {store.state==='error'&&<div className="daily-closed">Synchronisation indisponible : {store.message}</div>}
  <section className="maintenance-kpis"><article><AlertTriangle/><div><span>Urgentes</span><strong>{interventions.filter(i=>i.priority==='Urgente'&&i.status!=='Terminée').length}</strong></div></article><article><Wrench/><div><span>Ouvertes</span><strong>{interventions.filter(i=>i.status!=='Terminée').length}</strong></div></article><article><LockKeyhole/><div><span>Chambres bloquées</span><strong>{interventions.filter(i=>i.blocked).length}</strong></div></article><article><CheckCircle2/><div><span>Terminées</span><strong>{interventions.filter(i=>i.status==='Terminée').length}</strong></div></article></section>
  <section className="tickets-toolbar"><label className="tickets-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Référence, chambre, panne, technicien…"/></label><label className="tickets-service"><Filter size={17}/><select value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}><option>Toutes</option>{priorities.map(p=><option key={p}>{p}</option>)}</select></label></section>
  <section className="ticket-workspace"><div className="ticket-board maintenance-board">{statuses.map(status=>{const list=filtered.filter(i=>i.status===status);return <section className="ticket-column" key={status}><div className="ticket-column-header"><h2>{status}</h2><span>{list.length}</span></div><div className="ticket-stack">{list.map(item=><button className={`ticket-card${selected?.id===item.id?' selected':''}${item.blocked?' blocked':''}`} key={item.id} onClick={()=>setSelectedId(item.id)}><div className="ticket-card-top"><span className={`ticket-priority ${priorityClass(item.priority)}`}>{item.priority}</span><small>{item.reference}</small></div><strong>{item.title}</strong><p>{item.description}</p><div className="ticket-card-meta"><span><MapPin size={14}/>{locationLabel(item)}</span><span><UserRound size={14}/>{item.assignee||'Non assigné'}</span></div>{item.blocked&&<div className="maintenance-blocked"><LockKeyhole size={14}/>Chambre / zone bloquée</div>}<div className="ticket-due"><Clock3 size={14}/>{item.dueAt||'Sans échéance'}</div></button>)}{!list.length&&<p className="ticket-empty">Aucune intervention</p>}</div></section>})}</div>
   {selected&&<aside className="ticket-detail"><div className="ticket-detail-head"><div><span className={`ticket-priority ${priorityClass(selected.priority)}`}>{selected.priority}</span><small>{selected.reference}</small><h2>{selected.title}</h2></div><button className="detail-close" onClick={()=>setSelectedId('')}><X size={18}/></button></div><p className="ticket-description">{selected.description}</p><div className="ticket-properties"><div><span>Localisation</span><strong>{locationLabel(selected)}</strong></div><div><span>État chambre</span><strong>{selected.roomState}</strong></div><div><span>Demandeur</span><strong>{selected.requester}</strong></div><div><span>Responsable</span><strong>{selected.assignee||'Non assigné'}</strong></div><div><span>Créée</span><strong>{selected.createdAt}</strong></div><div><span>Échéance</span><strong>{selected.dueAt||'—'}</strong></div></div>
    <label className="field-label">Statut<select value={selected.status} onChange={e=>void changeStatus(e.target.value as MaintenanceStatus)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
    <label className="field-label">Technicien / responsable<input value={selected.assignee} onChange={e=>void patch({assignee:e.target.value},'Responsable modifié')}/></label>
    <label className="field-label">Priorité<select value={selected.priority} onChange={e=>void patch({priority:e.target.value as MaintenancePriority},'Priorité modifiée')}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label>
    <label className="field-label">Compte rendu de résolution<textarea value={selected.resolution} onChange={e=>void patch({resolution:e.target.value},'Compte rendu mis à jour')} placeholder="Travaux réalisés, pièce remplacée, contrôle effectué…"/></label>
    <div className="maintenance-photos"><div><span><Camera size={15}/>Photo avant</span>{selected.beforePhoto?<a href={selected.beforePhoto} target="_blank" rel="noreferrer">Ouvrir</a>:<em>Non renseignée</em>}</div><div><span><Camera size={15}/>Photo après</span><input value={selected.afterPhoto} onChange={e=>void patch({afterPhoto:e.target.value},'Photo après ajoutée')} placeholder="URL de la photo"/></div></div>
    {selected.blocked&&<button className="maintenance-return" disabled={selected.status!=='Terminée'||!selected.resolution.trim()} onClick={()=>void returnToService()}><CheckCircle2 size={17}/>Valider la remise en service</button>}
    {selected.returnedToServiceAt&&<div className="maintenance-returned"><CheckCircle2 size={17}/>Remise en service le {selected.returnedToServiceAt} par {selected.returnedToServiceBy}</div>}
    <div className="ticket-comments-title"><h3>Historique horodaté</h3><span>{selected.history.length}</span></div><div className="ticket-comments">{[...selected.history].reverse().map(entry=><div className="ticket-comment" key={entry.id}><div className="comment-avatar">{entry.actor.slice(0,2).toUpperCase()}</div><div><strong>{entry.actor}</strong><time>{entry.at}</time><p>{entry.action}{entry.note?` · ${entry.note}`:''}</p></div></div>)}</div><div className="ticket-comment-compose"><input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void addComment()} placeholder="Ajouter une note…"/><button onClick={()=>void addComment()}><Send size={17}/></button></div>
   </aside>}
  </section>
  {createOpen&&<div className="modal-backdrop" onMouseDown={()=>setCreateOpen(false)}><form className="modal ticket-modal" onSubmit={create} onMouseDown={e=>e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Nouvelle demande</p><h2>Créer une intervention</h2></div><button type="button" className="icon-button" onClick={()=>setCreateOpen(false)}><X/></button></div><label className="field-label">Titre<input name="title" required placeholder="Ex. Climatisation en panne"/></label><label className="field-label">Description<textarea name="description" required placeholder="Décrivez précisément le problème…"/></label><div className="ticket-form-grid"><label className="field-label">Bâtiment<select name="building"><option>A</option><option>B</option><option>Zone commune</option></select></label><label className="field-label">Étage<input name="floor" placeholder="4"/></label><label className="field-label">Chambre<input name="room" placeholder="412"/></label><label className="field-label">Zone<input name="area" placeholder="Hall, bar, salle…"/></label><label className="field-label">État chambre<select name="roomState"><option>Libre</option><option>Occupée</option><option>Bloquée</option></select></label><label className="field-label">Priorité<select name="priority">{priorities.map(p=><option key={p}>{p}</option>)}</select></label><label className="field-label">Responsable<input name="assignee" defaultValue="Maintenance"/></label><label className="field-label">Échéance<input name="dueAt" type="datetime-local"/></label><label className="field-label">Photo avant<input name="beforePhoto" placeholder="URL de la photo"/></label></div><label className="maintenance-checkbox"><input type="checkbox" name="blocked"/>Bloquer immédiatement la chambre ou la zone</label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setCreateOpen(false)}>Annuler</button><button className="primary-button" type="submit">Créer l’intervention</button></div></form></div>}
 </div>
}
