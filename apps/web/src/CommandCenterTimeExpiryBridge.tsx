import { useEffect } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Booking={id:string;title:string;room:string;date:string;start:string;end:string;attendees:number;status?:string};

function iso(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function at(date:string,time:string){
 const match=String(time||'').match(/^(\d{1,2}):(\d{2})/);if(!match)return Number.NaN;
 const parts=date.split('-').map(Number);if(parts.length!==3||parts.some(n=>!Number.isFinite(n)))return Number.NaN;
 return new Date(parts[0],parts[1]-1,parts[2],Number(match[1]),Number(match[2]),0,0).getTime();
}
function norm(value?:string){return String(value||'').replace(/\s+/g,' ').trim()}
function fold(value?:string){return norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR')}
function currentPlanningLabel(){return fold(new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}
function extractTimes(value?:string){return Array.from(String(value||'').matchAll(/\b(\d{1,2}:\d{2})\b/g),m=>m[1])}

export function CommandCenterTimeExpiryBridge(){
 const rooms=useOperationalStore<Booking[]>('meeting-rooms',[]);

 useEffect(()=>{
  let disposed=false;
  const applyCommandCenter=()=>{
   if(disposed||(location.pathname!=='/'&&location.pathname!==''))return;
   const now=Date.now(),today=iso(new Date(now));
   const bookings=rooms.data.filter(r=>r.date===today);
   const isExpired=(room:Booking)=>{const end=at(room.date,room.end);return Number.isFinite(end)&&end<=now};

   const actions=document.querySelector<HTMLElement>('.command-actions');
   if(actions){
    const actionRows=Array.from(actions.querySelectorAll<HTMLElement>('button, [role="button"]'));
    actionRows.forEach(row=>{
     const text=fold(row.textContent);
     const booking=bookings.find(r=>text.includes(fold(r.room))&&text.includes(fold(r.title)));
     if(booking)row.hidden=isExpired(booking);
    });
    const visibleActionRows=actionRows.filter(row=>!row.hidden);
    const badge=actions.querySelector<HTMLElement>(':scope > header > b');
    if(badge)badge.textContent=String(visibleActionRows.length);
   }

   const meetingPanel=document.querySelector<HTMLElement>('.command-meetings');
   if(meetingPanel){
    const body=meetingPanel.querySelector<HTMLElement>(':scope > div');
    if(body){
     const rows=Array.from(body.querySelectorAll<HTMLElement>('button, [role="button"]'));
     rows.forEach(row=>{
      const text=fold(row.textContent);
      const booking=bookings.find(r=>text.includes(fold(r.room))&&text.includes(fold(r.title)));
      if(booking)row.hidden=isExpired(booking);
     });
     let empty=body.querySelector<HTMLElement>('.time-expiry-empty');
     const visible=rows.some(row=>!row.hidden);
     if(!visible){if(!empty){empty=document.createElement('p');empty.className='command-empty time-expiry-empty';empty.textContent='Aucune salle réservée en cours ou à venir.';body.appendChild(empty)}empty.hidden=false}else if(empty)empty.hidden=true;
    }
   }
  };

  const applyTimeline=()=>{
   if(disposed||!location.pathname.startsWith('/planning-operationnel'))return;
   const timeline=document.querySelector<HTMLElement>('.op-plan-timeline');if(!timeline)return;
   const dateLabel=document.querySelector<HTMLElement>('.op-plan-datebar strong');
   const displayed=dateLabel?fold(dateLabel.textContent):currentPlanningLabel();
   const isToday=displayed===currentPlanningLabel();
   const now=Date.now(),today=iso(new Date(now));
   const rows=Array.from(timeline.querySelectorAll<HTMLElement>('.op-event'));
   rows.forEach(row=>{
    if(!isToday){row.hidden=false;return}
    const timeText=norm(row.querySelector('time')?.textContent)||extractTimes(row.textContent)[0]||'';
    const scheduled=at(today,timeText);
    row.hidden=Number.isFinite(scheduled)&&now>=scheduled+5*60_000;
   });
   const count=rows.filter(row=>!row.hidden).length;
   const counter=timeline.querySelector<HTMLElement>(':scope > header > span');if(counter)counter.textContent=`${count} événement(s)`;
  };

  const apply=()=>{applyCommandCenter();applyTimeline()};
  const timer=window.setInterval(apply,5_000);
  const observer=new MutationObserver(()=>window.requestAnimationFrame(apply));
  observer.observe(document.body,{childList:true,subtree:true});
  apply();
  return()=>{disposed=true;window.clearInterval(timer);observer.disconnect()};
 },[rooms.data]);

 return null;
}
