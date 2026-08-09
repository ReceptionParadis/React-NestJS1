import { useEffect } from 'react';
import { can, currentRole } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type MealCell={pax?:number;time?:string;water?:boolean;wine?:boolean};
type MealDay={date:string;pdjBox?:MealCell;[key:string]:unknown};
type Group={id:string;name?:string;mealDays?:MealDay[];[key:string]:unknown};

function selectedGroup(groups:Group[]){
 const title=document.querySelector<HTMLElement>('.group-detail h2')?.textContent?.trim();
 if(!title)return undefined;
 return groups.find(group=>String(group.name||'').trim()===title);
}

export function PdjBoxMealRow(){
 const store=useOperationalStore<Group[]>('group-360',[]);
 useEffect(()=>{
  if(!window.location.pathname.startsWith('/commercial/groupes'))return;
  const role=currentRole(),canEditPax=can('commercial.edit',role),canEditTime=canEditPax||can('reception.operate',role);

  const save=async(groupId:string,date:string,patch:Partial<MealCell>)=>{
   const latest=store.data;
   const next=latest.map(group=>{
    if(group.id!==groupId)return group;
    return {...group,mealDays:(group.mealDays||[]).map(day=>day.date===date?{...day,pdjBox:{pax:0,time:'06:30',water:false,wine:false,...(day.pdjBox||{}),...patch}}:day)};
   });
   await store.save(next);
  };

  const ensureRow=()=>{
   const body=document.querySelector<HTMLTableSectionElement>('.meal-table tbody');
   if(!body)return;
   const group=selectedGroup(store.data);
   if(!group)return;
   const days=group.mealDays||[];
   const signature=`${group.id}|${days.map(day=>`${day.date}:${Number(day.pdjBox?.pax||0)}:${day.pdjBox?.time||'06:30'}`).join('|')}|${canEditPax}|${canEditTime}`;
   const existing=body.querySelector<HTMLTableRowElement>('tr[data-pdj-box-row="true"]');
   if(existing?.dataset.signature===signature)return;
   existing?.remove();

   const row=document.createElement('tr');
   row.dataset.pdjBoxRow='true';
   row.dataset.signature=signature;
   const heading=document.createElement('th');
   heading.textContent='PDJ Box';
   row.appendChild(heading);

   days.forEach(day=>{
    const value={pax:0,time:'06:30',...(day.pdjBox||{})};
    const td=document.createElement('td');
    if(Number(value.pax)>0)td.className='meal-active';

    const pax=document.createElement('input');
    pax.type='number';pax.min='0';pax.inputMode='numeric';pax.value=String(Number(value.pax||0));pax.disabled=!canEditPax;
    pax.setAttribute('aria-label',`Effectif PDJ Box ${day.date}`);
    pax.addEventListener('keydown',event=>{if(event.key==='Enter')pax.blur()});
    pax.addEventListener('blur',()=>{const next=Math.max(0,Number(pax.value||0));if(next!==Number(value.pax||0))void save(group.id,day.date,{pax:next});});
    td.appendChild(pax);

    const time=document.createElement('input');
    time.type='time';time.className='meal-time';time.value=String(value.time||'06:30');time.disabled=!canEditTime;
    time.setAttribute('aria-label',`Horaire PDJ Box ${day.date}`);
    time.addEventListener('change',()=>{if(time.value!==String(value.time||'06:30'))void save(group.id,day.date,{time:time.value});});
    td.appendChild(time);

    const note=document.createElement('small');
    note.textContent=Number(value.pax)>0?'Bon de commande automatique':'Aucun bon';
    note.style.display='block';note.style.marginTop='6px';note.style.opacity='0.72';
    td.appendChild(note);
    row.appendChild(td);
   });

   const breakfast=Array.from(body.children).find(element=>element.querySelector('th')?.textContent?.trim()==='PDJ');
   if(breakfast?.nextSibling)body.insertBefore(row,breakfast.nextSibling);else body.appendChild(row);
  };

  ensureRow();
  const observer=new MutationObserver(()=>queueMicrotask(ensureRow));
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  return()=>{observer.disconnect();document.querySelectorAll('tr[data-pdj-box-row="true"]').forEach(row=>row.remove());};
 },[store.data]);
 return null;
}
