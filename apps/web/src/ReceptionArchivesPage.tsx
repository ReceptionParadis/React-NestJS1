import { ArrowLeft, CalendarDays, FileArchive, FileCheck2, Printer, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useOperationalStore } from './useOperationalStore';

type GroupControl={locked?:boolean;printedAt?:string;printedBy?:string;validatedAt?:string;validatedBy?:string;commercialValidation?:'À valider'|'Validé';commercialValidatedAt?:string;commercialValidatedBy?:string};
type Group={id:string;name?:string;arrival?:string;departure?:string;groupControl?:GroupControl};
type Sheet={id:string;weekStart:string;weekEnd:string;status:string;validatedForPrintBy?:string;validatedForPrintAt?:string;lockedBy?:string;lockedAt?:string};
type ArchiveItem={id:string;type:'Contrôle Groupe'|'Fiche de fonction';title:string;date:string;sort:number;month:string;author:string;status:string;href:string};

function parseDate(value?:string){if(!value)return 0;const french=value.match(/(\d{2})\/(\d{2})\/(\d{4})[^\d]*(\d{2}):(\d{2})/);if(french)return new Date(Number(french[3]),Number(french[2])-1,Number(french[1]),Number(french[4]),Number(french[5])).getTime();const iso=Date.parse(value);return Number.isFinite(iso)?iso:0}
function monthLabel(timestamp:number){if(!timestamp)return'Non daté';return new Date(timestamp).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())}
function dateLabel(timestamp:number){return timestamp?new Date(timestamp).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Date non disponible'}

export function ReceptionArchivesPage(){
 const groups=useOperationalStore<Group[]>('group-360',[]),sheets=useOperationalStore<Sheet[]>('function-sheets',[]),[query,setQuery]=useState('');
 const items=useMemo<ArchiveItem[]>(()=>{
  const controls=groups.data.flatMap(g=>{const c=g.groupControl;if(!c?.locked||!c.printedAt)return[];const sort=parseDate(c.printedAt);return[{id:`control-${g.id}`,type:'Contrôle Groupe' as const,title:g.name||'Groupe sans nom',date:dateLabel(sort),sort,month:monthLabel(sort),author:c.printedBy||c.validatedBy||'Utilisateur HospiCore',status:c.commercialValidation==='Validé'?'Validé Commercial':'Imprimé & verrouillé',href:'/reception/groupes'}];});
  const weekly=sheets.data.flatMap(s=>{if(!['Prête à imprimer','Diffusée','Clôturée'].includes(s.status))return[];const raw=s.lockedAt||s.validatedForPrintAt;const sort=parseDate(raw);return[{id:`sheet-${s.id}`,type:'Fiche de fonction' as const,title:`Semaine du ${s.weekStart} au ${s.weekEnd}`,date:dateLabel(sort),sort,month:monthLabel(sort),author:s.lockedBy||s.validatedForPrintBy||'Utilisateur HospiCore',status:s.status,href:'/reception/fiche-fonction'}];});
  return[...controls,...weekly].sort((a,b)=>b.sort-a.sort);
 },[groups.data,sheets.data]);
 const filtered=items.filter(i=>`${i.type} ${i.title} ${i.author} ${i.status} ${i.month}`.toLowerCase().includes(query.toLowerCase()));
 const months=Array.from(new Set(filtered.map(i=>i.month)));
 return <main className="reception-archives-page"><header className="reception-archives-header"><button onClick={()=>location.href='/reception'}><ArrowLeft size={18}/>Réception</button><p>HospiCore · Réception</p><h1><FileArchive size={30}/>Archives</h1><span>Documents validés ou imprimés, classés automatiquement par mois.</span></header><label className="reception-archives-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un groupe, une période, un utilisateur…"/></label>{months.length===0?<section className="reception-archives-empty"><FileCheck2 size={28}/><h2>Aucun document archivé</h2><p>Les contrôles Groupe imprimés et les fiches de fonction validées apparaîtront ici automatiquement.</p></section>:<section className="reception-archive-months">{months.map(month=><section className="reception-archive-month" key={month}><header><CalendarDays size={19}/><h2>{month}</h2><b>{filtered.filter(i=>i.month===month).length}</b></header><div>{filtered.filter(i=>i.month===month).map(item=><button key={item.id} onClick={()=>location.href=item.href}><span className="archive-doc-icon">{item.type==='Contrôle Groupe'?<Printer size={19}/>:<FileCheck2 size={19}/>}</span><div><strong>{item.title}</strong><span>{item.type} · {item.status}</span><small>{item.date} · {item.author}</small></div></button>)}</div></section>)}</section>}</main>;
}
