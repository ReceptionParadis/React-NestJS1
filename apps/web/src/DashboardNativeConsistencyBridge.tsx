import { useEffect, useMemo } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Audit={action?:string};
type GroupControl={validatedAt?:string;printedAt?:string;locked?:boolean};
type Group={id:string;name?:string;arrival?:string;status?:string;audit?:Audit[];groupControl?:GroupControl};
type Completion={groupId:string;groupName:string;validatedAt?:string;printedAt?:string;locked?:boolean};

function fold(value?:string){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function completedFromGroup(group:Group){
 if(group.groupControl?.validatedAt||group.groupControl?.printedAt||group.groupControl?.locked)return true;
 return (group.audit||[]).some(a=>{const text=fold(a.action);return text.includes('controle groupe reel enregistre')||text.includes('controle groupe imprime et verrouille')});
}
function todayKey(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function expiredRange(text:string){
 const match=text.match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
 if(!match)return false;
 const now=new Date(),end=new Date();end.setHours(Number(match[3]),Number(match[4]),0,0);
 return now.getTime()>end.getTime();
}

export function DashboardNativeConsistencyBridge(){
 const groups=useOperationalStore<Group[]>('group-360',[],30_000);
 const ledger=useOperationalStore<Completion[]>('group-control-completions',[],30_000);
 const state=useMemo(()=>{
  const completedIds=new Set<string>(),completedNames=new Set<string>();
  ledger.data.forEach(c=>{if(c.groupId)completedIds.add(String(c.groupId));if(c.groupName)completedNames.add(fold(c.groupName))});
  groups.data.filter(completedFromGroup).forEach(g=>{completedIds.add(String(g.id));if(g.name)completedNames.add(fold(g.name))});
  const active=groups.data.filter(g=>['arrive','en sejour'].includes(fold(g.status)));
  const completedActive=active.filter(g=>completedIds.has(String(g.id))||completedNames.has(fold(g.name)));
  const pending=active.filter(g=>!completedIds.has(String(g.id))&&!completedNames.has(fold(g.name)));
  const arrivedToday=new Set(groups.data.filter(g=>g.arrival===todayKey()&&['arrive','en sejour','parti'].includes(fold(g.status))).map(g=>fold(g.name)));
  return{completedNames,completedActive,pending,arrivedToday};
 },[groups.data,ledger.data]);

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

   const controlCard=Array.from(document.querySelectorAll<HTMLElement>('.command-kpis > article')).find(card=>fold(card.querySelector('span')?.textContent)==='controles');
   if(controlCard){const strong=controlCard.querySelector('strong'),small=controlCard.querySelector('small');if(strong)strong.textContent=String(state.completedActive.length);if(small)small.textContent=`${state.pending.length} à réaliser`;}
   document.querySelectorAll<HTMLElement>('.command-alerts > button').forEach(card=>{const text=fold(card.textContent);if(!text.includes('controle')||!text.includes('realiser'))return;const strong=card.querySelector('strong');if(strong)strong.textContent=String(state.pending.length);card.classList.toggle('warning',state.pending.length>0);card.classList.toggle('ok',state.pending.length===0)});
   document.querySelectorAll<HTMLElement>('.command-controls button').forEach(button=>{if(fold(button.querySelector('span')?.textContent)!=='a realiser')return;const strong=button.querySelector('strong');if(strong)strong.textContent=String(state.pending.length)});

   const arrivalSection=document.querySelector<HTMLElement>('.command-flow-columns > section:first-child');
   if(arrivalSection){
    const buttons=Array.from(arrivalSection.querySelectorAll<HTMLElement>('button'));
    buttons.forEach(button=>{const name=fold(button.querySelector('strong')?.textContent);if(name&&state.arrivedToday.has(name))button.style.display='none'});
    const headings=arrivalSection.querySelectorAll<HTMLElement>('h4');
    const todayHeading=headings[0];
    if(todayHeading){const todayVisible=buttons.filter(b=>b.style.display!=='none'&&!fold(b.querySelector('span')?.textContent).includes('j+1')).length;const badge=todayHeading.querySelector('b');if(badge)badge.textContent=String(todayVisible)}
    const h3=arrivalSection.querySelector('h3 b');if(h3)h3.textContent=String(buttons.filter(b=>b.style.display!=='none').length);
   }

   document.querySelectorAll<HTMLElement>('.command-meetings button').forEach(button=>{const text=button.textContent||'';if(expiredRange(text))button.style.display='none'});
  };
  const frame=requestAnimationFrame(apply);const delayed=window.setTimeout(apply,250);const timer=window.setInterval(apply,30_000);
  return()=>{cancelAnimationFrame(frame);window.clearTimeout(delayed);window.clearInterval(timer)};
 },[state]);
 return null;
}
