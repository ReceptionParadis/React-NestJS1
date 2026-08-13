import { useEffect } from 'react';

export function GroupBucketsBridge(){
 useEffect(()=>{
  if(!location.pathname.startsWith('/commercial/groupes'))return;
  const apply=()=>{
   const table=document.querySelector<HTMLElement>('.groups-table');
   if(!table)return;

   // React peut mettre à jour le statut d'un groupe après le premier rendu.
   // On reconstruit donc les rubriques à chaque changement au lieu de figer
   // la table avec dataset.buckets=1.
   const existingGroups=Array.from(table.querySelectorAll<HTMLElement>(':scope > details.group-arrival-dom, :scope > details.group-archive-dom'));
   const rows=Array.from(table.querySelectorAll<HTMLElement>('.groups-row:not(.groups-head)'));
   if(!rows.length)return;

   const head=table.querySelector<HTMLElement>('.groups-head');
   const headTemplate=head?.cloneNode(true) as HTMLElement|null;

   // Sort les lignes des anciens <details> avant de supprimer les wrappers.
   rows.forEach(row=>table.append(row));
   existingGroups.forEach(node=>node.remove());
   Array.from(table.querySelectorAll<HTMLElement>(':scope > .groups-head')).forEach(node=>node.remove());

   const active=new Map<string,HTMLElement[]>(),archives=new Map<string,HTMLElement[]>();
   const today=new Date();today.setHours(0,0,0,0);

   rows.forEach(row=>{
    const cells=row.querySelectorAll<HTMLElement>(':scope > span');
    const dates=(cells[1]?.textContent||'').match(/\d{4}-\d{2}-\d{2}/g)||[];
    const arrival=dates[0]||'',departure=dates[1]||'';
    const status=(cells[5]?.textContent||'').trim().toLocaleLowerCase('fr-FR');
    const dep=departure?new Date(`${departure}T12:00:00`):null;
    if(dep)dep.setHours(0,0,0,0);

    // Un groupe marqué Parti disparaît immédiatement de la vue active.
    // À défaut, il est automatiquement archivé dès que sa date de départ est dépassée.
    const archived=status==='parti'||Boolean(dep&&dep<today);
    const target=archived?archives:active;
    target.set(arrival,[...(target.get(arrival)||[]),row]);
   });

   const make=(date:string,list:HTMLElement[],open:boolean)=>{
    const details=document.createElement('details');details.className='group-arrival-dom';details.open=open;
    const summary=document.createElement('summary');
    const d=date?new Date(`${date}T12:00:00`):null;
    summary.innerHTML=`<strong>${d?d.toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}):'Date non renseignée'}</strong><small>${list.length} groupe${list.length>1?'s':''}</small>`;
    details.append(summary);
    if(headTemplate)details.append(headTemplate.cloneNode(true));
    list.forEach(row=>details.append(row));
    return details;
   };

   [...active.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([date,list],i)=>table.append(make(date,list,i===0)));
   if(archives.size){
    const root=document.createElement('details');root.className='group-archive-dom';
    const summary=document.createElement('summary');summary.innerHTML=`<strong>Archives</strong><small>${[...archives.values()].reduce((n,list)=>n+list.length,0)} groupe(s)</small>`;root.append(summary);
    [...archives.entries()].sort((a,b)=>b[0].localeCompare(a[0])).forEach(([date,list])=>root.append(make(date,list,false)));
    table.append(root);
   }
  };

  let scheduled=0;
  const schedule=()=>{window.clearTimeout(scheduled);scheduled=window.setTimeout(apply,40)};
  const observer=new MutationObserver(schedule);
  const start=()=>{
   const table=document.querySelector<HTMLElement>('.groups-table');
   if(!table)return false;
   observer.observe(table,{childList:true,subtree:true,characterData:true});
   apply();return true;
  };
  if(!start()){
   const wait=window.setInterval(()=>{if(start())window.clearInterval(wait)},200);
   return()=>{window.clearInterval(wait);window.clearTimeout(scheduled);observer.disconnect()};
  }
  return()=>{window.clearTimeout(scheduled);observer.disconnect()};
 },[]);
 return null;
}
