import { useEffect, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { createPortal } from 'react-dom';
import { can, currentRole } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type LineStatus='À relire'|'Validée';
type FunctionLine={id:string;groupId:string;groupName?:string;lineStatus?:LineStatus;validatedBy?:string;validatedAt?:string;[key:string]:unknown};
type WeeklySheet={id:string;weekStart:string;weekEnd:string;status?:string;lines?:FunctionLine[];validatedForPrintBy?:string;validatedForPrintAt?:string;lockedBy?:string;lockedAt?:string;[key:string]:unknown};
type SessionUser={name:string};
function sessionUser():SessionUser{try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}'),u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim()}}catch{return{name:'Utilisateur HospiCore'}}}
function stamp(){return new Date().toLocaleString('fr-FR')}
function isoFromFr(value:string){const m=value.match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:''}
function displayedWeekStart(){return isoFromFr(document.querySelector<HTMLElement>('.weekly-nav strong')?.textContent||'')}

export function FunctionSheetValidationHelper(){
 const store=useOperationalStore<WeeklySheet[]>('function-sheets',[]),[mount,setMount]=useState<HTMLElement|null>(null);
 const role=currentRole(),allowed=can('commercial.edit',role),user=sessionUser();
 useEffect(()=>{
  if(!allowed||!window.location.pathname.startsWith('/reception/fiche-fonction')){setMount(null);return;}
  const bind=()=>{
   const weekStart=displayedWeekStart(),sheet=store.data.find(s=>s.weekStart===weekStart);if(!sheet)return;
   document.querySelectorAll<HTMLButtonElement>('.function-sheet-table tbody button').forEach(button=>{
    const label=(button.textContent||'').trim();if(label!=='À relire'&&label!=='Validée')return;
    button.disabled=false;button.dataset.functionValidationHelper='true';
    if(button.dataset.functionValidationBound==='true')return;button.dataset.functionValidationBound='true';
    button.addEventListener('click',event=>{
     event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();
     const currentWeek=displayedWeekStart(),currentSheet=store.data.find(s=>s.weekStart===currentWeek);if(!currentSheet)return;
     const row=button.closest('tr'),groupName=row?.querySelector<HTMLElement>('td:nth-child(2) strong')?.textContent?.trim()||'';
     const current=(currentSheet.lines||[]).find(line=>String(line.groupName||'').trim()===groupName);if(!current)return;
     const validating=current.lineStatus!=='Validée',at=validating?stamp():'';
     const lines=(currentSheet.lines||[]).map(line=>line.id===current.id?{...line,lineStatus:validating?'Validée':'À relire',validatedBy:validating?user.name:'',validatedAt:at}:line);
     void store.save(store.data.map(s=>s.id===currentSheet.id?{...s,lines,status:'Préparation',validatedForPrintBy:'',validatedForPrintAt:'',lockedBy:'',lockedAt:''}:s));
    },true);
   });
   const footer=document.querySelector<HTMLElement>('.function-sheet-footer');if(!footer)return;
   let node=footer.querySelector<HTMLElement>('.function-validate-all-mount');if(!node){node=document.createElement('div');node.className='function-validate-all-mount';footer.appendChild(node)}
   setMount(previous=>previous===node?previous:node);
  };
  bind();const observer=new MutationObserver(()=>queueMicrotask(bind));observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','class']});
  return()=>{observer.disconnect();document.querySelectorAll('[data-function-validation-helper="true"]').forEach(el=>el.removeAttribute('data-function-validation-helper'));document.querySelectorAll('.function-validate-all-mount').forEach(el=>el.remove());setMount(null)};
 },[allowed,store.data]);
 if(!allowed||!mount)return null;
 const weekStart=displayedWeekStart(),sheet=store.data.find(s=>s.weekStart===weekStart),pending=(sheet?.lines||[]).filter(l=>l.lineStatus!=='Validée').length;
 const validateAll=()=>{if(!sheet||!(sheet.lines||[]).length)return;const at=stamp(),lines=(sheet.lines||[]).map(line=>({...line,lineStatus:'Validée' as const,validatedBy:user.name,validatedAt:at}));void store.save(store.data.map(s=>s.id===sheet.id?{...s,lines,status:'Préparation',validatedForPrintBy:'',validatedForPrintAt:'',lockedBy:'',lockedAt:''}:s));};
 return createPortal(<button type="button" className="function-validate-all" disabled={!pending} onClick={validateAll}><CheckCheck size={17}/>{pending?`Valider toute la fiche (${pending})`:'Toute la fiche est validée'}</button>,mount);
}
