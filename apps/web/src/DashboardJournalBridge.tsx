import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { roleFromValue } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type JournalEntry={id:string;at:string;actor?:string;role?:string;service?:string;namespace?:string;source?:string;action?:string;reference?:string};
type Audit={id:string;action:string;actor:string;role:string;at:string};
type Group={id:string;name?:string;audit?:Audit[];arrivalConfirmedAt?:string;arrivalConfirmedBy?:string;departureConfirmedAt?:string;departureConfirmedBy?:string};
type Complaint={id:string;client?:string;room?:string;category?:string;createdAt:string;createdBy?:string};
type Task={id:string;reference?:string;title?:string;assignee?:string;service?:string;createdAt?:string;history?:Array<{action?:string;actor?:string;role?:string;at?:string}>};
type Instruction={id:string;reference?:string;message?:string;createdAt:string;authorName?:string;authorRole?:string;authorService?:string};
type Maintenance={id:string;reference?:string;title?:string;createdAt?:string;createdBy?:string;assignee?:string;status?:string};
type LiveEntry={id:string;timestamp:number;actor:string;service:string;reference:string;action:string};

function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function isoDate(date=new Date()){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function parseDate(value?:string){const t=Date.parse(String(value||''));if(Number.isFinite(t))return t;const m=String(value||'').match(/(\d{2})\/(\d{2})\/(\d{4})[ ,à]*(\d{2}):(\d{2})(?::(\d{2}))?/);return m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0)).getTime():0}
function serviceForRole(){const role=roleFromValue(session()?.user?.role);return role==='direction'?'Direction':role==='commercial'?'Commercial':role==='maintenance'?'Maintenance':'Réception'}
function normalizeService(value?:string){const raw=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(raw.includes('maintenance')||raw.includes('technique'))return'Maintenance';if(raw.includes('commercial')||raw.includes('vente'))return'Commercial';if(raw.includes('direction')||raw.includes('directeur')||raw.includes('admin'))return'Direction';return'Réception'}
function normalize(value?:string){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function actionTone(value?:string){const raw=normalize(value);if(raw.includes('valid')||raw.includes('verrou')||raw.includes('termine'))return'validated';if(raw.includes('montant')||raw.includes('paiement')||raw.includes('solde')||raw.includes('caisse'))return'finance';if(raw.includes('arrive')||raw.includes('depart')||raw.includes('heure')||raw.includes('reveil'))return'schedule';return'update'}
function usefulJournal(entry:JournalEntry){const raw=normalize(`${entry.action} ${entry.source}`);return !raw.includes('mise a jour')&&!raw.includes('mis a jour')&&!raw.includes('synchronis')&&!raw.includes('actualis')}
function dedupe(items:LiveEntry[]){const seen=new Set<string>();return items.filter(item=>{const key=[item.reference,normalize(item.action),normalize(item.actor),Math.floor(item.timestamp/60000)].join('|');if(seen.has(key))return false;seen.add(key);return true})}

export function DashboardJournalBridge(){
 const journal=useOperationalStore<JournalEntry[]>('activity-journal',[],2500);
 const groups=useOperationalStore<Group[]>('group-360',[],2500);
 const complaints=useOperationalStore<Complaint[]>('client-complaints',[],2500);
 const tasks=useOperationalStore<Task[]>('tasks',[],2500);
 const instructions=useOperationalStore<Instruction[]>('general-instructions',[],2500);
 const maintenance=useOperationalStore<Maintenance[]>('maintenance-interventions',[],2500);
 const role=roleFromValue(session()?.user?.role),department=serviceForRole(),today=isoDate();
 const[target,setTarget]=useState<HTMLElement|null>(null);

 useEffect(()=>{
  if(!location.pathname||location.pathname!=='/')return;
  let cancelled=false;
  const install=()=>{
   if(cancelled)return;
   const panel=document.querySelector<HTMLElement>('.command-journal');
   if(!panel){window.setTimeout(install,120);return}
   let host=panel.querySelector<HTMLElement>(':scope > .dashboard-journal-host');
   if(!host){
    host=document.createElement('div');
    host.className='dashboard-journal-host';
    const header=panel.querySelector(':scope > header');
    Array.from(panel.children).forEach(child=>{if(child!==header)child.remove()});
    panel.appendChild(host);
   }
   setTarget(host);
   const heading=panel.querySelector<HTMLElement>('header p');
   if(heading)heading.textContent=`Aujourd’hui · ${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long'})}`;
  };
  install();
  return()=>{cancelled=true};
 },[today]);

 const entries=useMemo(()=>{
  const result:LiveEntry[]=[];
  journal.data.filter(usefulJournal).forEach(e=>{const timestamp=parseDate(e.at);if(!timestamp)return;result.push({id:`journal-${e.id}`,timestamp,actor:e.actor||'HospiCore',service:normalizeService(e.service||e.role),reference:e.reference||e.source||e.namespace||'HospiCore',action:e.action||'Action opérationnelle'});});
  groups.data.forEach(g=>{
   (g.audit||[]).forEach(a=>{const timestamp=parseDate(a.at);if(timestamp)result.push({id:`group-${g.id}-${a.id}`,timestamp,actor:a.actor||'HospiCore',service:normalizeService(a.role),reference:g.name||'Fiche Groupe 360°',action:a.action});});
   const arrival=parseDate(g.arrivalConfirmedAt);if(arrival)result.push({id:`arrival-${g.id}-${arrival}`,timestamp:arrival,actor:g.arrivalConfirmedBy||'Réception',service:'Réception',reference:g.name||'Groupe',action:'Groupe mis en arrivée'});
   const departure=parseDate(g.departureConfirmedAt);if(departure)result.push({id:`departure-${g.id}-${departure}`,timestamp:departure,actor:g.departureConfirmedBy||'Réception',service:'Réception',reference:g.name||'Groupe',action:'Groupe mis en départ'});
  });
  complaints.data.forEach(c=>{const timestamp=parseDate(c.createdAt);if(timestamp)result.push({id:`complaint-${c.id}`,timestamp,actor:c.createdBy||'Réception',service:'Réception',reference:c.room?`Plainte · Chambre ${c.room}`:'Plainte client',action:`Plainte déposée${c.client?` · ${c.client}`:''}${c.category?` · ${c.category}`:''}`});});
  tasks.data.forEach(t=>{const timestamp=parseDate(t.createdAt);if(timestamp)result.push({id:`task-${t.id}`,timestamp,actor:t.history?.[0]?.actor||'HospiCore',service:normalizeService(t.service),reference:t.reference||'Tâche',action:`Tâche créée${t.title?` · ${t.title}`:''}${t.assignee?` · ${t.assignee}`:''}`});});
  instructions.data.forEach(i=>{const timestamp=parseDate(i.createdAt);if(timestamp)result.push({id:`instruction-${i.id}`,timestamp,actor:i.authorName||'HospiCore',service:normalizeService(i.authorService||i.authorRole),reference:i.reference||'Consigne',action:'Consigne créée'});});
  maintenance.data.forEach(m=>{const timestamp=parseDate(m.createdAt);if(timestamp)result.push({id:`maintenance-${m.id}`,timestamp,actor:m.createdBy||'HospiCore',service:'Maintenance',reference:m.reference||'Maintenance',action:`Ticket créé${m.title?` · ${m.title}`:''}`});});
  return dedupe(result)
   .filter(e=>isoDate(new Date(e.timestamp))===today&&(role==='direction'||e.service===department))
   .sort((a,b)=>b.timestamp-a.timestamp)
   .slice(0,30);
 },[journal.data,groups.data,complaints.data,tasks.data,instructions.data,maintenance.data,today,role,department]);

 if(!target)return null;
 return createPortal(<div className="dashboard-journal-live">{entries.length?entries.map(e=>{const d=new Date(e.timestamp);return <article className={`journal-live-entry tone-${actionTone(e.action)}`} key={e.id}>
   <div className="journal-live-dot" aria-hidden="true"/>
   <time>{d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</time>
   <div className="journal-live-content">
    <strong>{e.reference}</strong>
    <p>{e.action}</p>
    <small>{e.actor}{e.service?` · ${e.service}`:''}</small>
   </div>
  </article>}):<p className="command-empty">Aucune action enregistrée aujourd’hui.</p>}</div>,target);
}
