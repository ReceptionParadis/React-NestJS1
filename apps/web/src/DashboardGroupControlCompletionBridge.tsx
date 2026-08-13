import { useEffect, useMemo } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Audit={action?:string;at?:string};
type GroupControl={validatedAt?:string;printedAt?:string;locked?:boolean};
type Group={id:string;name?:string;status?:string;audit?:Audit[];groupControl?:GroupControl};
type Completion={groupId:string;groupName:string;validatedAt:string;printedAt:string;locked:boolean};

function fold(v?:string){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function completedFromGroup(g:Group){
 if(g.groupControl?.validatedAt||g.groupControl?.printedAt||g.groupControl?.locked)return true;
 return (g.audit||[]).some(a=>{const x=fold(a.action);return x.includes('controle groupe reel enregistre')||x.includes('controle groupe imprime et verrouille')});
}

export function DashboardGroupControlCompletionBridge(){
 const groups=useOperationalStore<Group[]>('group-360',[]);
 const ledger=useOperationalStore<Completion[]>('group-control-completions',[]);
 const completed=useMemo(()=>{
  const ids=new Set<string>(),names=new Set<string>();
  ledger.data.forEach(c=>{ids.add(c.groupId);names.add(fold(c.groupName))});
  groups.data.filter(completedFromGroup).forEach(g=>{ids.add(g.id);names.add(fold(g.name))});
  return{ids,names};
 },[groups.data,ledger.data]);
 const activeGroups=useMemo(()=>groups.data.filter(g=>['Arrivé','En séjour'].includes(g.status||'')),[groups.data]);
 const pending=useMemo(()=>activeGroups.filter(g=>!completed.ids.has(g.id)&&!completed.names.has(fold(g.name))),[activeGroups,completed]);
 const completedActive=useMemo(()=>activeGroups.filter(g=>completed.ids.has(g.id)||completed.names.has(fold(g.name))),[activeGroups,completed]);

 useEffect(()=>{
  if(location.pathname!=='/'&&location.pathname!=='')return;
  const apply=()=>{
   document.querySelectorAll<HTMLElement>('.command-actions > div > button').forEach(row=>{
    const text=fold(row.textContent);
    if(!text.includes('controle groupe'))return;
    const isCompleted=[...completed.names].some(name=>name&&text.includes(name));
    row.style.display=isCompleted?'none':'';
   });

   const controlCard=Array.from(document.querySelectorAll<HTMLElement>('.command-kpis > article')).find(card=>fold(card.querySelector('span')?.textContent)==='controles');
   if(controlCard){
    const strong=controlCard.querySelector('strong');
    const small=controlCard.querySelector('small');
    if(strong)strong.textContent=String(completedActive.length);
    if(small)small.textContent=`${pending.length} à réaliser`;
   }

   document.querySelectorAll<HTMLElement>('.command-alerts > button').forEach(card=>{
    const text=fold(card.textContent);
    if(!text.includes('controle')||!text.includes('realiser'))return;
    const strong=card.querySelector('strong');
    if(strong)strong.textContent=String(pending.length);
    card.classList.toggle('warning',pending.length>0);
    card.classList.toggle('ok',pending.length===0);
   });

   document.querySelectorAll<HTMLElement>('.command-controls button').forEach(button=>{
    const label=fold(button.querySelector('span')?.textContent);
    if(label!=='a realiser')return;
    const strong=button.querySelector('strong');
    if(strong)strong.textContent=String(pending.length);
   });

   const actionPanel=document.querySelector<HTMLElement>('.command-actions');
   if(actionPanel){
    const visible=Array.from(actionPanel.querySelectorAll<HTMLElement>(':scope > div > button')).filter(el=>el.style.display!=='none');
    const badge=actionPanel.querySelector<HTMLElement>('header > b');
    if(badge)badge.textContent=String(visible.length);
    const empty=actionPanel.querySelector<HTMLElement>('.command-empty');
    if(empty)empty.style.display=visible.length===0?'flex':'none';
   }
  };
  apply();
  const observer=new MutationObserver(()=>requestAnimationFrame(apply));
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  const timer=window.setInterval(apply,1000);
  return()=>{observer.disconnect();window.clearInterval(timer)};
 },[completed,pending.length,completedActive.length]);
 return null;
}
