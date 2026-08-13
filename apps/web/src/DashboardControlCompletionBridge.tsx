import { useEffect, useMemo } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Audit={action?:string;at?:string};
type Control={validatedAt?:string;printedAt?:string;locked?:boolean};
type Group={id:string;name?:string;status?:string;groupControl?:Control;audit?:Audit[]};
type Completion={groupId:string;groupName:string;validatedAt?:string;printedAt?:string;locked?:boolean};

function fold(value?:string){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function auditDone(group:Group){
 return (group.audit||[]).some(a=>{
  const action=fold(a.action);
  return action.includes('controle groupe reel enregistre')||action.includes('controle groupe imprime et verrouille');
 });
}
function nativeDone(group:Group){return Boolean(group.groupControl?.validatedAt||group.groupControl?.printedAt||group.groupControl?.locked||auditDone(group))}

export function DashboardControlCompletionBridge(){
 const groups=useOperationalStore<Group[]>('group-360',[]);
 const ledger=useOperationalStore<Completion[]>('group-control-completions',[]);

 const state=useMemo(()=>{
  const ledgerIds=new Set(ledger.data.filter(c=>c.validatedAt||c.printedAt||c.locked).map(c=>c.groupId));
  const ledgerNames=new Set(ledger.data.filter(c=>c.validatedAt||c.printedAt||c.locked).map(c=>fold(c.groupName)));
  const present=groups.data.filter(g=>['Arrivé','En séjour'].includes(g.status||''));
  const isDone=(g:Group)=>nativeDone(g)||ledgerIds.has(g.id)||ledgerNames.has(fold(g.name));
  const completed=present.filter(isDone);
  const todo=present.filter(g=>!isDone(g));
  return{completed,todo,completedNames:new Set(completed.map(g=>fold(g.name)))};
 },[groups.data,ledger.data]);

 useEffect(()=>{
  if(location.pathname!=='/'&&location.pathname!=='')return;
  let applying=false;
  const apply=()=>{
   if(applying)return;
   applying=true;
   try{
    const todoCount=state.todo.length;
    const completedCount=state.completed.length;

    const alertButtons=Array.from(document.querySelectorAll<HTMLButtonElement>('.command-alerts > button'));
    const controlAlert=alertButtons.find(button=>fold(button.textContent).includes('controle(s) a realiser'));
    if(controlAlert){
      const strong=controlAlert.querySelector<HTMLElement>('strong');
      if(strong)strong.textContent=String(todoCount);
      controlAlert.classList.toggle('warning',todoCount>0);
      controlAlert.classList.toggle('ok',todoCount===0);
    }

    const kpis=Array.from(document.querySelectorAll<HTMLElement>('.command-kpis > article'));
    const controlKpi=kpis.find(article=>fold(article.querySelector('span')?.textContent)==='controles');
    if(controlKpi){
      const strong=controlKpi.querySelector<HTMLElement>('strong');
      const small=controlKpi.querySelector<HTMLElement>('small');
      if(strong)strong.textContent=String(completedCount);
      if(small)small.textContent=`${todoCount} à réaliser`;
    }

    const actions=document.querySelector<HTMLElement>('.command-actions');
    if(actions){
      const rows=Array.from(actions.querySelectorAll<HTMLButtonElement>(':scope > div > button'));
      rows.forEach(row=>{
        const label=fold(row.querySelector('strong')?.textContent);
        if(!label.startsWith('controle groupe'))return;
        const completed=Array.from(state.completedNames).some(name=>name&&label.includes(name));
        if(completed)row.style.setProperty('display','none','important');
        else row.style.removeProperty('display');
      });
      const visible=rows.filter(row=>getComputedStyle(row).display!=='none').length;
      const badge=actions.querySelector<HTMLElement>(':scope > header > b');
      if(badge)badge.textContent=String(visible);
    }

    const controlsPanel=document.querySelector<HTMLElement>('.command-controls');
    if(controlsPanel){
      const buttons=Array.from(controlsPanel.querySelectorAll<HTMLButtonElement>(':scope > div > button'));
      const todoButton=buttons.find(button=>fold(button.querySelector('span')?.textContent)==='a realiser');
      const value=todoButton?.querySelector<HTMLElement>('strong');
      if(value)value.textContent=String(todoCount);
    }
   }finally{applying=false}
  };

  apply();
  const observer=new MutationObserver(()=>requestAnimationFrame(apply));
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  const timer=window.setInterval(apply,2000);
  return()=>{observer.disconnect();window.clearInterval(timer)};
 },[state]);

 return null;
}
