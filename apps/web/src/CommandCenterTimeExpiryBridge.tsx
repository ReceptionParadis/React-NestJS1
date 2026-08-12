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
function currentPlanningLabel(){return new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toLocaleLowerCase('fr-FR')}

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
    const actionButtons=Array.from(actions.querySelectorAll<HTMLButtonElement>(':scope > div > button'));
    actionButtons.forEach(button=>{
     const title=norm(button.querySelector('strong')?.textContent),detail=norm(button.querySelector('small')?.textContent);
     const booking=bookings.find(r=>title===norm(`${r.room} · ${r.title}`)&&detail.startsWith(norm(`${r.start}–${r.end}`)));
     if(booking)button.hidden=isExpired(booking);
    });
    const count=actionButtons.filter(button=>!button.hidden).length;
    const badge=actions.querySelector<HTMLElement>(':scope > header > b');if(badge)badge.textContent=String(count);
   }

   const meetingPanel=document.querySelector<HTMLElement>('.command-meetings');
   if(meetingPanel){
    const body=meetingPanel.querySelector<HTMLElement>(':scope > div');
    if(body){
     const buttons=Array.from(body.querySelectorAll<HTMLButtonElement>(':scope > button'));
     buttons.forEach(button=>{
      const roomName=norm(button.querySelector('strong')?.textContent),detail=norm(button.querySelector('span')?.textContent),start=norm(button.querySelector('time')?.textContent);
      const booking=bookings.find(r=>roomName===norm(r.room)&&start===norm(r.start)&&detail.startsWith(norm(r.title)));
      if(booking)button.hidden=isExpired(booking);
     });
     let empty=body.querySelector<HTMLElement>('.time-expiry-empty');
     const visible=buttons.some(button=>!button.hidden);
     if(!visible){if(!empty){empty=document.createElement('p');empty.className='command-empty time-expiry-empty';empty.textContent='Aucune salle réservée en cours ou à venir.';body.appendChild(empty)}empty.hidden=false}else if(empty)empty.hidden=true;
    }
   }
  };

  const applyTimeline=()=>{
   if(disposed||!location.pathname.startsWith('/planning-operationnel'))return;
   const timeline=document.querySelector<HTMLElement>('.op-plan-timeline');if(!timeline)return;
   const displayed=norm(document.querySelector<HTMLElement>('.op-plan-datebar strong')?.textContent).toLocaleLowerCase('fr-FR');
   const isToday=displayed===currentPlanningLabel();
   const now=Date.now(),today=iso(new Date(now));
   const buttons=Array.from(timeline.querySelectorAll<HTMLButtonElement>('.op-event'));
   buttons.forEach(button=>{
    if(!isToday){button.hidden=false;return}
    const time=norm(button.querySelector('time')?.textContent),scheduled=at(today,time);
    button.hidden=Number.isFinite(scheduled)&&now>=scheduled+5*60_000;
   });
   const count=buttons.filter(button=>!button.hidden).length;
   const counter=timeline.querySelector<HTMLElement>(':scope > header > span');if(counter)counter.textContent=`${count} événement(s)`;
  };

  const apply=()=>{applyCommandCenter();applyTimeline()};
  const timer=window.setInterval(apply,10_000);
  const observer=new MutationObserver(()=>window.requestAnimationFrame(apply));
  observer.observe(document.body,{childList:true,subtree:true});
  apply();
  return()=>{disposed=true;window.clearInterval(timer);observer.disconnect()};
 },[rooms.data]);

 return null;
}
