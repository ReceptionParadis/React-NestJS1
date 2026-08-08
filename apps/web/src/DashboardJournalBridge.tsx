import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { roleFromValue } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type JournalEntry={id:string;at:string;actor?:string;role?:string;service?:string;namespace?:string;source?:string;action?:string;reference?:string};
function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function isoDate(date=new Date()){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function parseDate(value:string){const t=Date.parse(value);if(Number.isFinite(t))return t;const m=String(value||'').match(/(\d{2})\/(\d{2})\/(\d{4})[ ,à]*(\d{2}):(\d{2})(?::(\d{2}))?/);return m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0)).getTime():0}
function serviceForRole(){const role=roleFromValue(session()?.user?.role);return role==='direction'?'Direction':role==='commercial'?'Commercial':role==='maintenance'?'Maintenance':'Réception'}
function normalizeService(value?:string){const raw=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(raw.includes('maintenance')||raw.includes('technique'))return'Maintenance';if(raw.includes('commercial')||raw.includes('vente'))return'Commercial';if(raw.includes('direction')||raw.includes('directeur')||raw.includes('admin'))return'Direction';return'Réception'}
export function DashboardJournalBridge(){
 const store=useOperationalStore<JournalEntry[]>('activity-journal',[],5000);
 const role=roleFromValue(session()?.user?.role),department=serviceForRole(),today=isoDate();
 const entries=useMemo(()=>store.data.map(e=>({...e,timestamp:parseDate(e.at),service:normalizeService(e.service)})).filter(e=>e.timestamp&&isoDate(new Date(e.timestamp))===today&&(role==='direction'||e.service===department)).sort((a,b)=>b.timestamp-a.timestamp).slice(0,8),[store.data,today,role,department]);
 const target=document.querySelector<HTMLElement>('.command-journal > div:not(:first-child)');
 useEffect(()=>{const header=document.querySelector<HTMLElement>('.command-journal header p');if(header)header.textContent=`Traçabilité · ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})}`},[today]);
 if(!target)return null;
 return createPortal(<div className="dashboard-journal-live">{entries.length?entries.map(e=>{const d=new Date(e.timestamp);return <div key={e.id}><time>{d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time><div><strong>{e.actor||'HospiCore'} · {e.reference||e.source||e.namespace||e.service}</strong><span>{e.action||'Mise à jour'}</span></div></div>}):<p className="command-empty">Aucune action enregistrée aujourd’hui.</p>}</div>,target);
}
