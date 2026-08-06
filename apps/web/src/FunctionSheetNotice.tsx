import { BellRing, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadSharedData } from './operational-sync';

type WeeklySheet={id:string;weekStart:string;weekEnd:string;status:string;validatedForPrintAt?:string};

function currentRole(){try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}');const role=s.user?.role?.name||s.user?.role||'Collaborateur';return String(role)}catch{return'Collaborateur'}}

export function FunctionSheetNotice(){
 const [sheets,setSheets]=useState<WeeklySheet[]>([]);const [hidden,setHidden]=useState('');
 async function refresh(){const result=await loadSharedData<WeeklySheet[]>('function-sheets',[]);if(result.connected&&Array.isArray(result.payload))setSheets(result.payload)}
 useEffect(()=>{void refresh();const id=window.setInterval(()=>void refresh(),30000);return()=>window.clearInterval(id)},[]);
 const published=useMemo(()=>sheets.filter(s=>s.status==='Diffusée').sort((a,b)=>String(b.weekStart).localeCompare(String(a.weekStart)))[0],[sheets]);
 if(!published||hidden===published.id)return null;
 const key=`hospicore.function-sheet.seen.${published.id}.${currentRole()}`;
 if(localStorage.getItem(key)==='yes')return null;
 function acknowledge(){localStorage.setItem(key,'yes');window.location.href='/planning-hebdomadaire'}
 return <div className="function-sheet-notice"><BellRing size={21}/><div><strong>Nouvelle fiche de fonction disponible</strong><span>Semaine du {published.weekStart} au {published.weekEnd}. Consultez la version publiée en lecture seule.</span></div><button onClick={acknowledge}>Prendre connaissance <ChevronRight size={16}/></button><button className="function-sheet-dismiss" aria-label="Fermer" onClick={()=>setHidden(published.id)}><X size={17}/></button></div>
}
