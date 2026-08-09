import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock3 } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';
import './group-pending-helper.css';

type Group360Record={
 id:string;commercialValidated?:boolean;validatedAt?:string;validatedBy?:string;
 roomingPending?:boolean;arrivalTimePending?:boolean;departureTimePending?:boolean;
 dmc?:string;leaderFirstName?:string;leaderLastName?:string;leaderPhone?:string;leaderEmail?:string;
 [key:string]:unknown
};

type Target={key:string;label:string;field?:'dmc'|'leaderFirstName'|'leaderLastName'|'leaderPhone'|'leaderEmail';flag?:'roomingPending'|'arrivalTimePending'|'departureTimePending'};
const targets:Target[]=[
 {key:'dmc',label:'DMC',field:'dmc'},
 {key:'rooming',label:'Rooming List',flag:'roomingPending'},
 {key:'arrival',label:'Heure arrivée',flag:'arrivalTimePending'},
 {key:'departure',label:'Heure départ',flag:'departureTimePending'},
 {key:'leader-first',label:'Prénom Tour Leader',field:'leaderFirstName'},
 {key:'leader-last',label:'Nom Tour Leader',field:'leaderLastName'},
 {key:'leader-phone',label:'Téléphone Tour Leader',field:'leaderPhone'},
 {key:'leader-email',label:'E-mail Tour Leader',field:'leaderEmail'},
];

function selectedGroupId(data:Group360Record[]){
 const code=document.querySelector<HTMLElement>('.group-code')?.textContent?.trim().toLowerCase()||'';
 if(!code)return'';
 return data.find(group=>typeof group?.id==='string'&&group.id.toLowerCase().startsWith(code))?.id||'';
}

export function Group360PendingInfoHelper(){
 const store=useOperationalStore<Group360Record[]>('group-360',[]);
 const[mount,setMount]=useState<HTMLElement|null>(null);
 const selectedId=selectedGroupId(store.data);
 const selected=useMemo(()=>store.data.find(group=>group.id===selectedId),[store.data,selectedId]);

 useEffect(()=>{
  if(!window.location.pathname.includes('/groupes')){setMount(null);return;}
  const attach=()=>{
   const detail=document.querySelector<HTMLElement>('.group-detail');
   if(!detail){setMount(null);return false;}
   let node=detail.querySelector<HTMLElement>(':scope > .group-pending-native-mount');
   if(!node){
    node=document.createElement('div');node.className='group-pending-native-mount';
    const summary=detail.querySelector('.group-summary');
    if(summary)summary.after(node);else detail.prepend(node);
   }
   setMount(node);return true;
  };
  attach();
  const observer=new MutationObserver(()=>attach());
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();document.querySelectorAll('.group-pending-native-mount').forEach(node=>node.remove());};
 },[]);

 async function markPending(target:Target){
  const id=selectedGroupId(store.data);if(!id)return;
  const next=store.data.map(group=>{
   if(group.id!==id)return group;
   const update:Group360Record={...group,commercialValidated:false};
   if(target.field)update[target.field]='À venir';
   if(target.flag)update[target.flag]=true;
   return update;
  });
  await store.save(next);
 }

 function active(target:Target){
  if(!selected)return false;
  if(target.field)return String(selected[target.field]||'').trim().toLowerCase()==='à venir';
  return target.flag?Boolean(selected[target.flag]):false;
 }

 if(!mount||!selected)return null;
 return createPortal(<section className="group-pending-native" aria-label="Informations à venir">
   <div className="group-pending-native-head"><Clock3 size={17}/><div><strong>Informations à venir</strong><small>Utilisez ces boutons lorsque l’information n’est pas encore connue. La fiche pourra ensuite être validée puis revalidée.</small></div></div>
   <div className="group-pending-native-actions">{targets.map(target=><button type="button" key={target.key} className={active(target)?'active':''} onClick={event=>{event.preventDefault();event.stopPropagation();void markPending(target)}}>{active(target)?'✓ ':''}{target.label}</button>)}</div>
  </section>,mount);
}
