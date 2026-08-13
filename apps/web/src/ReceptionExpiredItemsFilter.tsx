import { useEffect } from 'react';

function expired(dateText:string,time:string,now:Date){
 const match=dateText.match(/(\d{1,2})\/(\d{1,2})/);if(!match)return false;
 const day=Number(match[1]),month=Number(match[2]);
 const at=new Date(now.getFullYear(),month-1,day,23,59,59,999);
 const hm=time.match(/(\d{1,2}):(\d{2})/);if(hm)at.setHours(Number(hm[1]),Number(hm[2]),0,0);
 return at.getTime()<now.getTime();
}

function apply(){
 const now=new Date();
 document.querySelectorAll<HTMLElement>('.reception-meal-tools > div').forEach(day=>{
  const dateText=day.querySelector(':scope > b')?.textContent||'';
  const rows=Array.from(day.querySelectorAll<HTMLLabelElement>(':scope > label'));
  rows.forEach(row=>{const time=row.querySelector<HTMLInputElement>('input[type="time"]')?.value||'';row.hidden=expired(dateText,time,now)});
  day.hidden=rows.length>0&&rows.every(row=>row.hidden);
 });
}

export function ReceptionExpiredItemsFilter(){
 useEffect(()=>{apply();const timer=window.setInterval(apply,60_000);return()=>window.clearInterval(timer)},[]);
 return null;
}
