import { useEffect } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Group={id:string;name?:string;status?:string};

export function Group360ArchiveFilter(){
 const store=useOperationalStore<Group[]>('group-360',[]);
 useEffect(()=>{
  if(!window.location.pathname.startsWith('/commercial/groupes'))return;
  const archivedId=new URLSearchParams(window.location.search).get('archive');
  const departed=new Map(store.data.filter(g=>g.status==='Parti').map(g=>[g.id,String(g.name||'').trim()]));
  const apply=()=>{
   const rows=Array.from(document.querySelectorAll<HTMLElement>('.groups-table .groups-row:not(.groups-head)'));
   if(archivedId){
    const name=departed.get(archivedId);if(!name)return;
    rows.forEach(row=>{row.style.display='';const title=row.querySelector('strong')?.textContent?.trim()||'';if(title===name&&!row.classList.contains('selected'))row.click()});
    return;
   }
   const departedNames=new Set(Array.from(departed.values()).filter(Boolean));
   rows.forEach(row=>{const title=row.querySelector('strong')?.textContent?.trim()||'';row.style.display=departedNames.has(title)?'none':''});
   document.querySelectorAll<HTMLButtonElement>('.filter-chips .filter-chip').forEach(button=>{if(button.textContent?.trim()==='Parti')button.style.display='none'});
   const selected=document.querySelector<HTMLElement>('.groups-table .groups-row.selected');
   if(selected&&selected.style.display==='none')rows.find(row=>row.style.display!=='none')?.click();
  };
  apply();
  const observer=new MutationObserver(apply);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  return()=>observer.disconnect();
 },[store.data]);
 return null;
}
