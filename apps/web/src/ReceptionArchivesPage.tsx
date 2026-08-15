import { ArrowLeft, FileArchive, MoonStar, Search, WalletCards, ClipboardCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useOperationalStore } from './useOperationalStore';

type GroupControl={id:string;groupName:string;agency:string;arrival:string;departure:string;pax:number;rooms:number;status:string;validatedAt?:string;validatedBy?:string;updatedAt:string;updatedBy:string};
type NightRoute={date:string;updatedAt:string;updatedBy:string;validatedAt?:string;validatedBy?:string};
type CashArchive={id?:string;date?:string;department?:'reception'|'restaurant'|'bar';cashier?:string;lockedAt?:string;lockedBy?:string;directionValidatedAt?:string};
type ArchiveItem={id:string;type:'Contrôle Groupe'|'Feuille de route veilleur'|'Caisse';title:string;date:string;timestamp:number;author:string;status:string;href:string};
function parse(value?:string){if(!value)return 0;const fr=value.match(/(\d{2})\/(\d{2})\/(\d{4})[^\d]*(\d{2}):(\d{2})/);if(fr)return new Date(Number(fr[3]),Number(fr[2])-1,Number(fr[1]),Number(fr[4]),Number(fr[5])).getTime();const n=Date.parse(value);return Number.isFinite(n)?n:0}
function format(ts:number){return ts?new Date(ts).toLocaleString('fr-FR'):'Date non disponible'}
function cashRows(data:unknown):CashArchive[]{if(Array.isArray(data))return data as CashArchive[];return data&&typeof data==='object'?[data as CashArchive]:[]}
function icon(type:ArchiveItem['type']){return type==='Contrôle Groupe'?<ClipboardCheck size={19}/>:type==='Caisse'?<WalletCards size={19}/>:<MoonStar size={19}/>}

export function ReceptionArchivesPage(){
 const controls=useOperationalStore<GroupControl[]>('group-controls',[],3000),nights=useOperationalStore<NightRoute[]>('night-route-notes',[],3000),cash=useOperationalStore<unknown>('reception-cash-day',[],3000),[query,setQuery]=useState('');
 const items=useMemo<ArchiveItem[]>(()=>{
  const controlItems=controls.data.filter(c=>c.status==='Validé').map(c=>{const ts=parse(c.validatedAt)||parse(c.updatedAt);return{id:`control-${c.id}`,type:'Contrôle Groupe' as const,title:c.groupName,date:format(ts),timestamp:ts,author:c.validatedBy||c.updatedBy,status:`${c.agency||'Sans agence'} · ${c.pax||0} pax · ${c.rooms||0} ch.`,href:`/reception/controles?control=${encodeURIComponent(c.id)}`}});
  const nightItems=nights.data.filter(n=>n.validatedAt).map(n=>{const ts=parse(n.validatedAt);return{id:`night-${n.date}`,type:'Feuille de route veilleur' as const,title:`Nuit du ${new Date(`${n.date}T12:00:00`).toLocaleDateString('fr-FR')}`,date:format(ts),timestamp:ts,author:n.validatedBy||n.updatedBy,status:'Validée',href:`/reception/feuille-route-veilleur?date=${n.date}`}});
  const cashItems=cashRows(cash.data).filter(c=>c.lockedAt&&c.date).map(c=>{const ts=parse(c.lockedAt),dep=c.department==='restaurant'?'Restaurant':c.department==='bar'?'Bar':'Réception';return{id:`cash-${c.department||'reception'}-${c.id||c.date}`,type:'Caisse' as const,title:`Caisse ${dep} du ${new Date(`${c.date}T12:00:00`).toLocaleDateString('fr-FR')}`,date:format(ts),timestamp:ts,author:c.lockedBy||c.cashier||'Utilisateur HospiCore',status:c.directionValidatedAt?'Validée Direction':'Verrouillée',href:`/reception/caisse?department=${c.department||'reception'}&date=${c.date}`}});
  return [...controlItems,...nightItems,...cashItems].sort((a,b)=>b.timestamp-a.timestamp);
 },[controls.data,nights.data,cash.data]);
 const filtered=items.filter(i=>`${i.type} ${i.title} ${i.author} ${i.status} ${i.date}`.toLowerCase().includes(query.toLowerCase()));
 const groups=Array.from(new Set(filtered.map(i=>i.type)));
 return <main className="reception-archives-page"><header className="reception-archives-header"><button onClick={()=>location.href='/'}><ArrowLeft size={18}/>Accueil</button><p>HospiCore</p><h1><FileArchive size={30}/>Archives</h1><span>Archives opérationnelles uniquement : contrôles groupes, feuilles de nuit et caisses verrouillées.</span></header><label className="reception-archives-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un document, un groupe, une date ou un utilisateur…"/></label>{!filtered.length?<section className="reception-archives-empty"><FileArchive size={28}/><h2>Aucun document archivé</h2><p>Les documents validés apparaîtront automatiquement ici.</p></section>:<section className="archive-tree-simple">{groups.map(type=><section key={type} className="archive-simple-group"><header><span>{icon(type)}</span><div><strong>{type}</strong><small>{filtered.filter(i=>i.type===type).length} document(s)</small></div></header><div>{filtered.filter(i=>i.type===type).map(item=><button key={item.id} onClick={()=>location.href=item.href}><span>{icon(item.type)}</span><div><strong>{item.title}</strong><p>{item.status}</p><small>{item.date} · {item.author}</small></div></button>)}</div></section>)}</section>}</main>;
}
