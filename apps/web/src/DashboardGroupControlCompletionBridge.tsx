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
 const pending=useMemo(()=>groups.data.filter(g=>['Arrivé','En séjour'].includes(g.status||'')&&!completed.ids.has(g.id)&&!completed.names.has(fold(g.name))),[groups.data,completed]);

 useEffect(()=>{
  if(location.pathname!=='/'&&location.pathname!=='')return;
  const apply=()=>{
   // Remove stale "Contrôle Groupe" actions that refer to a completed control.
   document.querySelectorAll<HTMLElement>('.command-actions article, .command-actions li, .command-actions a, .command-actions button').forEach(row=>{
    const text=fold(row.textContent);
    if(!text.includes('controle groupe'))return;
    const isCompleted=[...completed.names].some(name=>name&&text.includes(name));
    if(isCompleted)row.style.display='none';
   });
   // The dashboard KPI is the fourth card: its main value and subtitle must use the same source of truth.
   const cards=Array.from(document.querySelectorAll<HTMLElement>('.command-kpis > article'));
   const controlCard=cards[3];
   if(controlCard){
    const strong=controlCard.querySelector('strong');
    const small=controlCard.querySelector('small');
    if(strong)strong.textContent=String(pending.length);
    if(small)small.textContent=`${pending.length} à réaliser`;
   }
   // Top alert banner: replace stale count with the same pending count.
   document.querySelectorAll<HTMLElement>('.command-alerts article, .command-status article, .command-health article').forEach(card=>{
    const text=fold(card.textContent);
    if(!text.includes('controle')||!text.includes('realiser'))return;
    const strong=card.querySelector('strong,b');
    if(strong)strong.textContent=String(pending.length);
   });
   // Recompute visible action counter after stale rows are hidden.
   const actionBox=Array.from(document.querySelectorAll<HTMLElement>('section,article')).find(el=>fold(el.textContent).includes('actions prioritaires'));
   if(actionBox){
    const visible=Array.from(actionBox.querySelectorAll<HTMLElement>('a,button')).filter(el=>el.style.display!=='none'&&fold(el.textContent).length>2);
    const badge=actionBox.querySelector<HTMLElement>('.badge, header b, header strong');
    if(badge&&/^\d+$/.test((badge.textContent||'').trim()))badge.textContent=String(visible.length);
   }
  };
  apply();
  const observer=new MutationObserver(()=>requestAnimationFrame(apply));
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  const timer=window.setInterval(apply,1500);
  return()=>{observer.disconnect();window.clearInterval(timer)};
 },[completed,pending.length]);
 return null;
}
