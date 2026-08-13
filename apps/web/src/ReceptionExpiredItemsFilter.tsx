import { useEffect } from 'react';

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}

function displayedDate(dateText:string,now:Date){
 const match=dateText.match(/(\d{1,2})\/(\d{1,2})/);if(!match)return null;
 const day=Number(match[1]),month=Number(match[2]);
 const candidates=[now.getFullYear()-1,now.getFullYear(),now.getFullYear()+1].map(year=>new Date(year,month-1,day,12,0,0,0));
 return candidates.sort((a,b)=>Math.abs(a.getTime()-now.getTime())-Math.abs(b.getTime()-now.getTime()))[0]||null;
}

function expired(dateText:string,time:string,now:Date){
 const at=displayedDate(dateText,now);if(!at)return false;
 const hm=time.match(/(\d{1,2}):(\d{2})/);
 if(hm)at.setHours(Number(hm[1]),Number(hm[2]),0,0);else at.setHours(23,59,59,999);
 return at.getTime()<now.getTime();
}

function apply(){
 const now=new Date();
 document.querySelectorAll<HTMLElement>('.reception-op-card.present .reception-present-tools').forEach(tools=>{
  tools.querySelectorAll<HTMLElement>(':scope > section').forEach(section=>{
   const title=normalize(section.querySelector('header strong')?.textContent||'');
   if(title.includes('horaires repas')){
    section.querySelectorAll<HTMLElement>('.reception-meal-tools > div').forEach(day=>{
     const dateText=day.querySelector(':scope > b')?.textContent||'';
     const rows=Array.from(day.querySelectorAll<HTMLLabelElement>(':scope > label'));
     rows.forEach(row=>{const time=row.querySelector<HTMLInputElement>('input[type="time"]')?.value||'';row.hidden=expired(dateText,time,now)});
     day.hidden=rows.length>0&&rows.every(row=>row.hidden);
    });
   }
   if(title.includes('reveils')){
    section.querySelectorAll<HTMLElement>('.reception-tool-row').forEach(row=>{
     const text=row.textContent||'';const time=text.match(/(\d{1,2}:\d{2})/)?.[1]||'';row.hidden=expired(text,time,now);
    });
   }
   if(title.includes('salles')){
    section.querySelectorAll<HTMLElement>('.reception-tool-row').forEach(row=>{
     const text=row.textContent||'';const times=Array.from(text.matchAll(/(\d{1,2}:\d{2})/g),match=>match[1]);row.hidden=expired(text,times.at(-1)||'',now);
    });
   }
  });
 });
}

export function ReceptionExpiredItemsFilter(){
 useEffect(()=>{
  apply();
  const timer=window.setInterval(apply,60_000);
  const refresh=()=>window.setTimeout(apply,0);
  document.addEventListener('click',refresh,true);document.addEventListener('change',refresh,true);
  return()=>{window.clearInterval(timer);document.removeEventListener('click',refresh,true);document.removeEventListener('change',refresh,true)};
 },[]);
 return null;
}
