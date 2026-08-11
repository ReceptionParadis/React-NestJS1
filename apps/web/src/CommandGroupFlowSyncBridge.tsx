import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, LogIn, LogOut, UsersRound } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type DepartureChecklist={settlementStatus?:'pending'|'paid'|'debtor';paymentMethod?:string;debtorName?:string;keysRecovered?:boolean};
type GroupControl={validatedAt?:string};
type Group={id:string;name?:string;pax?:number;arrival?:string;departure?:string;arrivalTime?:string;departureTime?:string;status?:string;departureChecklist?:DepartureChecklist;groupControl?:GroupControl};

function iso(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function addDay(value:string,n:number){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+n);return iso(d)}
function shortDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'})}
function arrived(g:Group){return ['Arrivé','En séjour'].includes(g.status||'')}
function departed(g:Group){return g.status==='Parti'}
function departureReady(g:Group){const c=g.departureChecklist;const paid=c?.settlementStatus==='paid'?Boolean(c.paymentMethod):c?.settlementStatus==='debtor'?Boolean(c.debtorName):false;return paid&&Boolean(c?.keysRecovered)&&Boolean(g.groupControl?.validatedAt)}

export function CommandGroupFlowSyncBridge(){
 const store=useOperationalStore<Group[]>('group-360',[]);
 const [mount,setMount]=useState<HTMLElement|null>(null);
 const today=iso(new Date()),tomorrow=addDay(today,1);
 const groups=Array.isArray(store.data)?store.data:[];
 const arrivals=useMemo(()=>groups.filter(g=>g.arrival===today&&!arrived(g)&&!departed(g)).sort((a,b)=>(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99')),[groups,today]);
 const present=useMemo(()=>groups.filter(g=>arrived(g)&&!departed(g)&&String(g.arrival||'9999')<=today&&String(g.departure||'0000')>=today).sort((a,b)=>(a.departure||'9999').localeCompare(b.departure||'9999')||(a.departureTime||'99:99').localeCompare(b.departureTime||'99:99')),[groups,today]);
 const departures=useMemo(()=>groups.filter(g=>g.departure===today&&!departed(g)).sort((a,b)=>(a.departureTime||'99:99').localeCompare(b.departureTime||'99:99')),[groups,today]);
 const tomorrowArrivals=useMemo(()=>groups.filter(g=>g.arrival===tomorrow&&!departed(g)).sort((a,b)=>(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99')),[groups,tomorrow]);
 const tomorrowDepartures=useMemo(()=>groups.filter(g=>g.departure===tomorrow&&!departed(g)).sort((a,b)=>(a.departureTime||'99:99').localeCompare(b.departureTime||'99:99')),[groups,tomorrow]);

 useEffect(()=>{
  if(location.pathname!=='/'&&location.pathname!=='')return;
  let cancelled=false;
  const attach=()=>{
   if(cancelled)return;
   const original=document.querySelector<HTMLElement>('.command-flow-columns');
   if(!original){window.setTimeout(attach,120);return}
   original.style.display='none';
   let node=original.parentElement?.querySelector<HTMLElement>(':scope > .command-flow-sync-mount')||null;
   if(!node&&original.parentElement){node=document.createElement('div');node.className='command-flow-sync-mount';original.after(node)}
   setMount(node);
  };
  attach();
  return()=>{cancelled=true;document.querySelectorAll<HTMLElement>('.command-flow-columns').forEach(n=>n.style.display='');document.querySelectorAll('.command-flow-sync-mount').forEach(n=>n.remove())};
 },[]);

 useEffect(()=>{
  const kpis=Array.from(document.querySelectorAll<HTMLElement>('.command-kpis > article'));
  const values=[
   {count:present.length,sub:`${present.reduce((n,g)=>n+Number(g.pax||0),0)} personnes`},
   {count:arrivals.length,sub:`${arrivals.reduce((n,g)=>n+Number(g.pax||0),0)} personnes`},
   {count:departures.length,sub:'à effectuer'},
  ];
  values.forEach((value,index)=>{const card=kpis[index];if(!card)return;const strong=card.querySelector('strong'),small=card.querySelector('small');if(strong)strong.textContent=String(value.count);if(small)small.textContent=value.sub});
 },[present.length,arrivals.length,departures.length,groups]);

 if(!mount)return null;
 const item=(g:Group,kind:'arrival'|'present'|'departure'|'j1-arrival'|'j1-departure')=>{
  const isJ1=kind.startsWith('j1-'),time=kind.includes('arrival')?g.arrivalTime:g.departureTime;
  const subtitle=kind==='present'?`Présent · départ ${g.departureTime||'à confirmer'}`:kind.includes('departure')?(departureReady(g)?'Prêt au départ':'Préparation du départ'):(isJ1?'J+1':'À accueillir');
  return <button key={`${kind}-${g.id}`} className={`flow-sync-item ${kind}`} onClick={()=>location.href='/reception/arrivees-departs'}><time>{time||'—'}</time><div><strong>{g.name||'Groupe sans nom'}</strong><span>{g.pax||0} pax · {subtitle}</span></div></button>;
 };
 return createPortal(<>
  <style>{`
   .command-flow-sync{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid #eee5df;background:#fff}
   .command-flow-sync>section{min-width:0;padding:16px;border-right:1px solid #eee5df}.command-flow-sync>section:last-child{border-right:0}
   .command-flow-sync h3{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:15px;color:#2b1d21}.command-flow-sync h3 b{margin-left:auto;min-width:24px;height:24px;border-radius:999px;display:grid;place-items:center;background:#f3e8eb;color:#7b1931;font-size:12px}
   .command-flow-sync h4{margin:14px 0 8px;font-size:12px;color:#7b1931}.command-flow-sync h4 b{float:right}.command-flow-sync .present-title{color:#287143}
   .flow-sync-item{width:100%;display:grid;grid-template-columns:58px minmax(0,1fr);gap:10px;align-items:center;text-align:left;padding:10px 11px;margin:0 0 7px;border:1px solid #eaded7;border-radius:11px;background:#fffaf7;color:#2b1d21;cursor:pointer}
   .flow-sync-item.present{background:#f0f8f2;border-color:#c8e2cf}.flow-sync-item.departure,.flow-sync-item.j1-departure{background:#f7fbf8;border-color:#d6e8db}.flow-sync-item:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(72,42,48,.08)}
   .flow-sync-item time{font-size:14px;font-weight:850;color:#7b1931}.flow-sync-item strong{display:block;font-size:13px;overflow-wrap:anywhere}.flow-sync-item span{display:block;margin-top:2px;font-size:10.5px;color:#8d747a}.flow-sync-empty{margin:8px 0 14px;color:#9a858a;font-size:12px}
   @media(max-width:1250px){.command-flow-sync{grid-template-columns:1fr}.command-flow-sync>section{border-right:0;border-bottom:1px solid #eee5df}.command-flow-sync>section:last-child{border-bottom:0}}
  `}</style>
  <div className="command-flow-sync">
   <section><h3><LogIn size={17}/>Arrivées à faire <b>{arrivals.length}</b></h3>{arrivals.length?arrivals.map(g=>item(g,'arrival')):<p className="flow-sync-empty">Aucune arrivée à effectuer aujourd’hui.</p>}<h4>Demain · {shortDate(tomorrow)} <b>{tomorrowArrivals.length}</b></h4>{tomorrowArrivals.length?tomorrowArrivals.map(g=>item(g,'j1-arrival')):<p className="flow-sync-empty">Aucune arrivée demain.</p>}</section>
   <section><h3 className="present-title"><UsersRound size={17}/>Présents <b>{present.length}</b></h3>{present.length?present.map(g=>item(g,'present')):<p className="flow-sync-empty"><CheckCircle2 size={15}/> Aucun groupe actuellement présent.</p>}</section>
   <section><h3><LogOut size={17}/>Départs à faire <b>{departures.length}</b></h3>{departures.length?departures.map(g=>item(g,'departure')):<p className="flow-sync-empty">Aucun départ à effectuer aujourd’hui.</p>}<h4>Demain · {shortDate(tomorrow)} <b>{tomorrowDepartures.length}</b></h4>{tomorrowDepartures.length?tomorrowDepartures.map(g=>item(g,'j1-departure')):<p className="flow-sync-empty">Aucun départ demain.</p>}</section>
  </div>
 </>,mount);
}
