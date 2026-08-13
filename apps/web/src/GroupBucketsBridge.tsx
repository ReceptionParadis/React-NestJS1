import { useEffect } from 'react';

export function GroupBucketsBridge(){
 useEffect(()=>{
  if(!location.pathname.startsWith('/commercial/groupes'))return;
  const apply=()=>{
   const table=document.querySelector<HTMLElement>('.groups-table');
   if(!table||table.dataset.buckets==='1')return;
   const rows=Array.from(table.querySelectorAll<HTMLElement>(':scope > .groups-row:not(.groups-head)'));
   if(!rows.length)return;
   const head=table.querySelector<HTMLElement>(':scope > .groups-head');
   head?.remove();
   const active=new Map<string,HTMLElement[]>(),archives=new Map<string,HTMLElement[]>();
   const today=new Date();today.setHours(0,0,0,0);
   rows.forEach(row=>{
    const cells=row.querySelectorAll<HTMLElement>(':scope > span');
    const dates=(cells[1]?.textContent||'').match(/\d{4}-\d{2}-\d{2}/g)||[];
    const arrival=dates[0]||'',departure=dates[1]||'';
    const status=(cells[5]?.textContent||'').trim();
    const dep=departure?new Date(`${departure}T12:00:00`):null;if(dep)dep.setHours(0,0,0,0);
    const archived=status==='Parti'||Boolean(dep&&dep<today);const target=archived?archives:active;
    target.set(arrival,[...(target.get(arrival)||[]),row]);
   });
   const make=(date:string,list:HTMLElement[],open:boolean)=>{const details=document.createElement('details');details.className='group-arrival-dom';details.open=open;const summary=document.createElement('summary');const d=date?new Date(`${date}T12:00:00`):null;summary.innerHTML=`<strong>${d?d.toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}):'Date non renseignée'}</strong><small>${list.length} groupe${list.length>1?'s':''}</small>`;details.append(summary);if(head)details.append(head.cloneNode(true));list.forEach(row=>details.append(row));return details};
   [...active.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([date,list],i)=>table.append(make(date,list,i===0)));
   if(archives.size){const root=document.createElement('details');root.className='group-archive-dom';const summary=document.createElement('summary');summary.innerHTML='<strong>Archives</strong>';root.append(summary);[...archives.entries()].sort((a,b)=>b[0].localeCompare(a[0])).forEach(([date,list])=>root.append(make(date,list,false)));table.append(root)}
   table.dataset.buckets='1';
  };
  const timer=window.setInterval(apply,300);apply();return()=>window.clearInterval(timer);
 },[]);
 return null;
}
