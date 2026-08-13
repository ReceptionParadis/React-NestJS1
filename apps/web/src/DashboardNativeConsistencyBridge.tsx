import { useEffect, useMemo } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Audit={action?:string};
type GroupControl={validatedAt?:string;printedAt?:string;locked?:boolean};
type Group={id:string;name?:string;arrival?:string;status?:string;audit?:Audit[];groupControl?:GroupControl};
type Completion={groupId:string;groupName:string;validatedAt?:string;printedAt?:string;locked?:boolean};
type Booking={id:string;title:string;room:string;date:string;start:string;end:string;attendees:number;status?:string};

const REFRESH_MS=5_000;

function fold(value?:string){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function completedFromGroup(group:Group){
 if(group.groupControl?.validatedAt||group.groupControl?.printedAt||group.groupControl?.locked)return true;
 return (group.audit||[]).some(a=>{const text=fold(a.action);return text.includes('controle groupe reel enregistre')||text.includes('controle groupe imprime et verrouille')});
}
function dateKey(date=new Date()){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function addDays(value:string,days:number){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+days);return dateKey(d)}
function bookingExpired(booking:Booking,now=new Date()){
 if(booking.date<dateKey(now))return true;
 if(booking.date>dateKey(now))return false;
 const match=String(booking.end||'').match(/^(\d{1,2}):(\d{2})/);if(!match)return false;
 const end=new Date(now);end.setHours(Number(match[1]),Number(match[2]),0,0);return now.getTime()>end.getTime();
}
function expiredRange(text:string){
 const match=text.match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);if(!match)return false;
 const now=new Date(),end=new Date();end.setHours(Number(match[3]),Number(match[4]),0,0);return now.getTime()>end.getTime();
}
function matchesBooking(text:string,booking:Booking){const hay=fold(text);return hay.includes(fold(booking.room))&&hay.includes(fold(booking.title))&&hay.includes(fold(booking.start))}

export function DashboardNativeConsistencyBridge(){
 const groups=useOperationalStore<Group[]>('group-360',[],REFRESH_MS);
 const ledger=useOperationalStore<Completion[]>('group-control-completions',[],REFRESH_MS);
 const meetings=useOperationalStore<Booking[]>('meeting-rooms',[],REFRESH_MS);
 const state=useMemo(()=>{
  const completedIds=new Set<string>(),completedNames=new Set<string>();
  ledger.data.forEach(c=>{if(c.groupId)completedIds.add(String(c.groupId));if(c.groupName)completedNames.add(fold(c.groupName))});
  groups.data.filter(completedFromGroup).forEach(g=>{completedIds.add(String(g.id));if(g.name)completedNames.add(fold(g.name))});
  const isCompleted=(g:Group)=>completedIds.has(String(g.id))||completedNames.has(fold(g.name));
  const today=dateKey();
  const active=groups.data.filter(g=>['arrive','en sejour'].includes(fold(g.status)));
  const completedActive=active.filter(isCompleted);
  const pending=active.filter(g=>!isCompleted(g));
  const noLongerArrival=new Set(groups.data.filter(g=>['arrive','en sejour','parti'].includes(fold(g.status))).map(g=>fold(g.name)));
  const pendingByDate=[0,1,2].map(offset=>{
   const date=addDays(today,offset);
   if(offset===0)return pending.length;
   return groups.data.filter(g=>g.arrival===date&&fold(g.status)!=='parti'&&!isCompleted(g)).length;
  });
  const todayMeetings=meetings.data.filter(m=>m.date===today);
  const activeMeetingIds=new Set(todayMeetings.filter(m=>!bookingExpired(m)).map(m=>m.id));
  return{completedNames,completedActive,pending,noLongerArrival,pendingByDate,todayMeetings,activeMeetingIds};
 },[groups.data,ledger.data,meetings.data]);

 useEffect(()=>{
  if(location.pathname!=='/'&&location.pathname!=='')return;
  const apply=()=>{
   const actionRows=Array.from(document.querySelectorAll<HTMLElement>('.command-actions > div > button'));
   actionRows.forEach(row=>{
    const text=fold(row.textContent);
    if(text.includes('controle groupe')){
      const done=[...state.completedNames].some(name=>name&&text.includes(name));
      row.style.display=done?'none':'';
      return;
    }
    const detail=row.querySelector('small')?.textContent||'';
    if(expiredRange(detail))row.style.display='none';
   });
   const actionPanel=document.querySelector<HTMLElement>('.command-actions');
   if(actionPanel){
    const visible=Array.from(actionPanel.querySelectorAll<HTMLElement>(':scope > div > button')).filter(el=>el.style.display!=='none');
    const badge=actionPanel.querySelector<HTMLElement>('header > b');if(badge)badge.textContent=String(visible.length);
    const empty=actionPanel.querySelector<HTMLElement>('.command-empty');if(empty)empty.style.display=visible.length===0?'flex':'none';
   }

   const kpiRoutes:Record<string,string>={
    'groupes presents':'/reception/groupes',
    'arrivees':'/reception/arrivees-departs',
    'departs':'/reception/arrivees-departs',
    'controles':'/reception/controles',
    'maintenance ouverte':'/tickets',
   };
   document.querySelectorAll<HTMLElement>('.command-kpis > article').forEach(card=>{
    const label=fold(card.querySelector('span')?.textContent),href=kpiRoutes[label];
    if(!href)return;
    card.setAttribute('role','link');
    card.setAttribute('aria-label',`${card.querySelector('span')?.textContent||'Indicateur'} — ouvrir le détail`);
    card.tabIndex=0;
    card.style.cursor='pointer';
    card.onclick=()=>location.assign(href);
    card.onkeydown=(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();location.assign(href)}};
   });

   const controlCard=Array.from(document.querySelectorAll<HTMLElement>('.command-kpis > article')).find(card=>fold(card.querySelector('span')?.textContent)==='controles');
   if(controlCard){const strong=controlCard.querySelector('strong'),small=controlCard.querySelector('small');if(strong)strong.textContent=String(state.completedActive.length);if(small)small.textContent=`${state.pending.length} à réaliser`;}
   document.querySelectorAll<HTMLElement>('.command-alerts > button').forEach(card=>{const text=fold(card.textContent);if(!text.includes('controle')||!text.includes('realiser'))return;const strong=card.querySelector('strong');if(strong)strong.textContent=String(state.pending.length);card.classList.toggle('warning',state.pending.length>0);card.classList.toggle('ok',state.pending.length===0)});
   document.querySelectorAll<HTMLElement>('.command-controls button').forEach(button=>{if(fold(button.querySelector('span')?.textContent)!=='a realiser')return;const strong=button.querySelector('strong');if(strong)strong.textContent=String(state.pending.length)});

   const arrivalSection=document.querySelector<HTMLElement>('.command-flow-columns > section:first-child');
   if(arrivalSection){
    const buttons=Array.from(arrivalSection.querySelectorAll<HTMLElement>('button'));
    buttons.forEach(button=>{const name=fold(button.querySelector('strong')?.textContent);button.style.display=name&&state.noLongerArrival.has(name)?'none':''});
    const headings=arrivalSection.querySelectorAll<HTMLElement>('h4');
    if(headings[0]){const todayButtons=buttons.filter(b=>!fold(b.querySelector('span')?.textContent).includes('j+1'));const count=todayButtons.filter(b=>b.style.display!=='none').length;const badge=headings[0].querySelector('b');if(badge)badge.textContent=String(count)}
    if(headings[1]){const tomorrowButtons=buttons.filter(b=>fold(b.querySelector('span')?.textContent).includes('j+1'));const count=tomorrowButtons.filter(b=>b.style.display!=='none').length;const badge=headings[1].querySelector('b');if(badge)badge.textContent=String(count)}
    const h3=arrivalSection.querySelector('h3 b');if(h3)h3.textContent=String(buttons.filter(b=>b.style.display!=='none').length);
   }

   const meetingButtons=Array.from(document.querySelectorAll<HTMLElement>('.command-meetings > div > button'));
   meetingButtons.forEach(button=>{
    const booking=state.todayMeetings.find(item=>matchesBooking(button.textContent||'',item));
    button.style.display=booking&&!state.activeMeetingIds.has(booking.id)?'none':'';
   });
   const meetingEmpty=document.querySelector<HTMLElement>('.command-meetings .command-empty');
   if(meetingEmpty)meetingEmpty.style.display=meetingButtons.some(b=>b.style.display!=='none')?'none':'';

   const forecastRows=Array.from(document.querySelectorAll<HTMLTableRowElement>('.command-forecast tbody tr'));
   forecastRows.forEach((row,index)=>{const cells=row.querySelectorAll<HTMLTableCellElement>('td');if(cells[4]&&state.pendingByDate[index]!==undefined)cells[4].textContent=String(state.pendingByDate[index])});
  };
  const frame=requestAnimationFrame(apply);const delayed=window.setTimeout(apply,150);const timer=window.setInterval(apply,REFRESH_MS);
  return()=>{cancelAnimationFrame(frame);window.clearTimeout(delayed);window.clearInterval(timer)};
 },[state]);
 return null;
}
