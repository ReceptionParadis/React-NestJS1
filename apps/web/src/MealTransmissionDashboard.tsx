import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ExternalLink, PackageCheck, Printer, ShieldCheck } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';
import './meal-transmission-dashboard.css';

type MealOrder={id:string;type:string;date:string;pickupTime:string;quantity:number;recipient:string;status?:string;printedAt?:string;printedBy?:string;verifiedAt?:string;verifiedBy?:string};

function actor(){try{const u=JSON.parse(localStorage.getItem('hospicore.session')||'{}').user||{};return`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim()}catch{return'Utilisateur HospiCore'}}
function dateLabel(value:string){return value?new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'}):'—'}
function chronologicalKey(order:MealOrder){return `${order.date||'9999-12-31'}T${order.pickupTime||'23:59'}`}

export function MealTransmissionDashboard(){
 const store=useOperationalStore<MealOrder[]>('meal-orders',[]),[mount,setMount]=useState<HTMLElement|null>(null);
 const pending=useMemo(()=>store.data
  .filter(o=>!o.verifiedAt||!o.printedAt)
  .sort((a,b)=>chronologicalKey(a).localeCompare(chronologicalKey(b))||a.type.localeCompare(b.type,'fr')||a.recipient.localeCompare(b.recipient,'fr')),[store.data]);
 useEffect(()=>{
  if(window.location.pathname!=='/'&&window.location.pathname!=='')return;
  let node=document.getElementById('meal-transmission-dashboard-mount') as HTMLElement|null;
  const attach=()=>{
   const host=document.querySelector('.command-content') as HTMLElement|null;if(!host)return false;
   if(!node){node=document.createElement('div');node.id='meal-transmission-dashboard-mount';const kpis=host.querySelector('.command-kpis');if(kpis)kpis.after(node);else host.prepend(node);}
   setMount(node);return true;
  };
  if(attach())return()=>{node?.remove()};
  const observer=new MutationObserver(()=>{if(attach())observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();node?.remove()};
 },[]);
 async function verify(id:string){const now=new Date().toISOString(),by=actor();await store.save(store.data.map(o=>o.id===id?{...o,verifiedAt:now,verifiedBy:by}:o))}
 if(!mount)return null;
 return createPortal(<section className={`meal-transmission-dashboard ${pending.length?'has-pending':'is-clear'}`}>
  <header><div className="meal-transmission-title"><span className="meal-transmission-icon"><PackageCheck size={22}/></span><div><p>Réception · Bons de commande</p><h2>Bons en attente de transmission</h2><small>Classés chronologiquement par date puis heure de remise. Un bon reste affiché tant qu’il n’est pas vérifié et imprimé.</small></div></div><button onClick={()=>location.assign('/reception/paniers-repas-pdj')}>Ouvrir les bons <ExternalLink size={15}/></button></header>
  <div className="meal-transmission-count"><strong>{pending.length}</strong><span>{pending.length===1?'bon à finaliser':'bons à finaliser'}</span></div>
  {pending.length===0?<div className="meal-transmission-empty"><CheckCircle2 size={24}/><div><strong>Tout est transmis</strong><span>Aucun bon n’attend de vérification ou d’impression.</span></div></div>:<div className="meal-transmission-list">{pending.slice(0,8).map((o,index)=><article key={o.id}><div className="meal-transmission-main"><strong><span className="meal-order-rank">#{index+1}</span>{o.type} · {o.quantity} unité(s)</strong><span>{o.recipient||'Groupe'} · {dateLabel(o.date)} · {o.pickupTime||'—'}</span></div><div className="meal-transmission-statuses"><span className={o.verifiedAt?'done':'pending'}><ShieldCheck size={13}/>{o.verifiedAt?'Vérifié':'À vérifier'}</span><span className={o.printedAt?'done':'pending'}><Printer size={13}/>{o.printedAt?'Imprimé':'À imprimer'}</span></div>{!o.verifiedAt&&<button className="meal-verify-button" onClick={()=>void verify(o.id)}><CheckCircle2 size={14}/>Valider la vérification</button>}</article>)}</div>}
  {pending.length>8&&<footer>+ {pending.length-8} autre(s) bon(s) en attente · ouvrir le sous-menu pour tout consulter.</footer>}
 </section>,mount);
}
