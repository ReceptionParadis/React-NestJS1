import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpenCheck, Clock3, Filter, Hotel, Package, Search, UsersRound, Wrench } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type Audit={id?:string;action?:string;actor?:string;role?:string;at?:string;comment?:string};
type Group={id:string;name?:string;audit?:Audit[]};
type Task={id:string;reference?:string;service?:string;priority?:string;history?:Audit[]};
type Instruction={id:string;reference?:string;service?:string;category?:string;priority?:string;history?:Audit[]};
type Loan={id:string;reference?:string;history?:Audit[]};
type Equipment={id:string;inventoryNumber?:string;label?:string;updatedBy?:string;updatedAt?:string;status?:string};
type OperationsStore={loans?:Loan[];equipment?:Equipment[]};
type Maintenance={id:string;reference?:string;title?:string;priority?:string;history?:Audit[];audit?:Audit[];createdBy?:string;createdAt?:string};
type Activity={id:string;at:string;timestamp:number;action:string;actor:string;role:string;service:string;source:string;reference?:string;priority?:string};

function parseFrenchDate(value:string){const match=value.match(/(\d{2})\/(\d{2})\/(\d{4})[ ,à]*(\d{2}):(\d{2})(?::(\d{2}))?/);if(match)return new Date(Number(match[3]),Number(match[2])-1,Number(match[1]),Number(match[4]),Number(match[5]),Number(match[6]||0)).getTime();const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:0;}
function normalizeService(value?:string){const raw=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(raw.includes('maintenance')||raw.includes('technique'))return'Maintenance';if(raw.includes('commercial')||raw.includes('vente'))return'Commercial';if(raw.includes('direction')||raw.includes('directeur')||raw.includes('admin'))return'Direction';return'Réception';}
const serviceIcons:Record<string,typeof Hotel>={Réception:Hotel,Maintenance:Wrench,Commercial:UsersRound,Direction:BookOpenCheck};

export function ActivityJournalPage(){
 const groups=useOperationalStore<Group[]>('group-360',[]),tasks=useOperationalStore<Task[]>('tasks',[]),instructions=useOperationalStore<Instruction[]>('general-instructions',[]),operations=useOperationalStore<OperationsStore>('operations-center',{loans:[],equipment:[]}),maintenance=useOperationalStore<Maintenance[]>('maintenance-interventions',[]);
 const [service,setService]=useState('Tous'),[query,setQuery]=useState('');
 const items=useMemo<Activity[]>(()=>{
  const result:Activity[]=[];
  const pushAudit=(prefix:string,entries:Audit[]|undefined,serviceName:string,source:string,reference?:string,priority?:string)=>{(entries||[]).forEach((entry,index)=>{const at=entry.at||'';result.push({id:`${prefix}-${entry.id||index}`,at,timestamp:parseFrenchDate(at),action:entry.action||'Mise à jour',actor:entry.actor||'Utilisateur HospiCore',role:entry.role||serviceName,service:serviceName,source,reference,priority});});};
  groups.data.forEach(group=>pushAudit(`group-${group.id}`,group.audit,'Réception','Groupe 360°',group.name));
  tasks.data.filter(task=>!['Housekeeping','Restaurant','Cuisine'].includes(task.service||'')).forEach(task=>pushAudit(`task-${task.id}`,task.history,normalizeService(task.service),'Tâche',task.reference,task.priority));
  instructions.data.filter(item=>!['Housekeeping','Restaurant','Cuisine'].includes(item.service||'')).forEach(item=>pushAudit(`instruction-${item.id}`,item.history,normalizeService(item.service),item.category||'Consigne',item.reference,item.priority));
  (operations.data.loans||[]).forEach(loan=>pushAudit(`loan-${loan.id}`,loan.history,'Réception','Prêt de matériel',loan.reference));
  (operations.data.equipment||[]).forEach(item=>{if(item.updatedAt)result.push({id:`equipment-${item.id}`,at:item.updatedAt,timestamp:parseFrenchDate(item.updatedAt),action:`Matériel ${item.label||item.inventoryNumber||''} · ${item.status||'mis à jour'}`,actor:item.updatedBy||'Utilisateur HospiCore',role:'Réception',service:'Réception',source:'Inventaire',reference:item.inventoryNumber});});
  maintenance.data.forEach(item=>{const entries=item.history||item.audit;if(entries?.length)pushAudit(`maintenance-${item.id}`,entries,'Maintenance','Intervention',item.reference||item.title,item.priority);else if(item.createdAt)result.push({id:`maintenance-${item.id}`,at:item.createdAt,timestamp:parseFrenchDate(item.createdAt),action:`Intervention créée · ${item.title||'Maintenance'}`,actor:item.createdBy||'Utilisateur HospiCore',role:'Maintenance',service:'Maintenance',source:'Intervention',reference:item.reference,priority:item.priority});});
  return result.sort((a,b)=>b.timestamp-a.timestamp);
 },[groups.data,tasks.data,instructions.data,operations.data,maintenance.data]);
 const services=useMemo(()=>['Tous',...Array.from(new Set(items.map(item=>item.service)))],[items]);
 const filtered=useMemo(()=>items.filter(item=>(service==='Tous'||item.service===service)&&`${item.action} ${item.actor} ${item.role} ${item.source} ${item.reference||''}`.toLowerCase().includes(query.toLowerCase())),[items,service,query]);
 const todayCount=items.filter(item=>new Date(item.timestamp).toDateString()===new Date().toDateString()).length,uniqueUsers=new Set(items.map(item=>item.actor)).size,criticalCount=items.filter(item=>item.priority==='Critique'||item.priority==='Urgente').length;
 const stores=[groups,tasks,instructions,operations,maintenance],loading=stores.some(store=>store.state==='loading'||store.state==='saving'),hasError=stores.some(store=>store.state==='error'||store.state==='conflict');
 const refresh=()=>stores.forEach(store=>void store.refresh());
 return <div className="activity-page"><header className="activity-header"><div><button onClick={()=>location.href='/'}><ArrowLeft size={18}/>Tableau de bord</button><p>HospiCore · Traçabilité</p><h1>Journal d’exploitation</h1><span>Flux unique construit à partir des données partagées PostgreSQL.</span></div><button className="activity-refresh" onClick={refresh}><Clock3 size={17}/>{loading?'Synchronisation…':hasError?'Réessayer':'Actualiser'}</button></header>
 <section className="activity-kpis"><article><Clock3/><span>Actions aujourd’hui</span><strong>{todayCount}</strong></article><article><UsersRound/><span>Collaborateurs actifs</span><strong>{uniqueUsers}</strong></article><article><BookOpenCheck/><span>Événements enregistrés</span><strong>{items.length}</strong></article><article><Wrench/><span>Alertes critiques</span><strong>{criticalCount}</strong></article></section>
 <section className="activity-toolbar"><label><Search size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Rechercher une action, un utilisateur ou une référence…"/></label><div><Filter size={17}/><select value={service} onChange={event=>setService(event.target.value)}>{services.map(item=><option key={item}>{item}</option>)}</select></div></section>
 <section className="activity-feed">{filtered.map(item=>{const Icon=serviceIcons[item.service]||Package;return <article key={item.id} className="activity-entry"><div className="activity-time"><strong>{item.at.split(' ').slice(-1)[0]}</strong><span>{item.at.split(' ').slice(0,-1).join(' ')}</span></div><div className="activity-line"><i/></div><div className="activity-icon"><Icon size={19}/></div><div className="activity-content"><div><span>{item.service}</span>{item.priority&&<em className={item.priority.toLowerCase()}>{item.priority}</em>}</div><h2>{item.action}</h2><p>{item.source}{item.reference?` · ${item.reference}`:''}</p><small>Signé par <strong>{item.actor}</strong> · {item.role}</small></div></article>})}{filtered.length===0&&<div className="activity-empty">Aucune action ne correspond aux filtres sélectionnés.</div>}</section></div>;
}
