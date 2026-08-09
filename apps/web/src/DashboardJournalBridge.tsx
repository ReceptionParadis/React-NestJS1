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
function actionTone(value?:string){const raw=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(raw.includes('valid')||raw.includes('verrou'))return'validated';if(raw.includes('montant')||raw.includes('paiement')||raw.includes('solde'))return'finance';if(raw.includes('arrive')||raw.includes('depart')||raw.includes('heure'))return'schedule';return'update'}
export function DashboardJournalBridge(){
 const store=useOperationalStore<JournalEntry[]>('activity-journal',[],5000);
 const role=roleFromValue(session()?.user?.role),department=serviceForRole(),today=isoDate();
 const entries=useMemo(()=>store.data.map(e=>({...e,timestamp:parseDate(e.at),service:normalizeService(e.service)})).filter(e=>e.timestamp&&isoDate(new Date(e.timestamp))===today&&(role==='direction'||e.service===department)).sort((a,b)=>b.timestamp-a.timestamp).slice(0,10),[store.data,today,role,department]);
 const target=document.querySelector<HTMLElement>('.command-journal > div:not(:first-child)');
 useEffect(()=>{const header=document.querySelector<HTMLElement>('.command-journal header p');if(header)header.textContent='Dernières activités en temps réel'},[today]);
 if(!target)return null;
 return createPortal(<div className="dashboard-journal-live">{entries.length?entries.map(e=>{const d=new Date(e.timestamp);const reference=e.reference||e.source||e.namespace||e.service||'HospiCore';return <article className={`journal-live-entry tone-${actionTone(e.action)}`} key={e.id}>
   <div className="journal-live-marker" aria-hidden="true"><span/></div>
   <div className="journal-live-date"><b>{d.toLocaleDateString('fr-FR',{day:'2-digit'})}</b><span>{d.toLocaleDateString('fr-FR',{month:'short'}).replace('.','')}</span></div>
   <div className="journal-live-content"><strong>{reference}</strong><p>{e.action||'Mise à jour'}</p><small>{e.actor||'HospiCore'}{e.service?` · ${e.service}`:''}</small></div>
   <time>{d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time>
  </article>}):<p className="command-empty">Aucune action enregistrée aujourd’hui.</p>}</div>,target);
}
