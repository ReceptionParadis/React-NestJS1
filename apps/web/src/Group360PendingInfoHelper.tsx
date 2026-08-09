import { useEffect } from 'react';
import { useOperationalStore } from './useOperationalStore';
import './group-pending-helper.css';

type Group360Record={id:string;commercialValidated?:boolean;validatedAt?:string;validatedBy?:string;roomingPending?:boolean;arrivalTimePending?:boolean;departureTimePending?:boolean;[key:string]:unknown};

type PendingTarget={label:string;field?:string;flag?:'roomingPending'|'arrivalTimePending'|'departureTimePending'};
const targets:PendingTarget[]=[
 {label:'DMC',field:'dmc'},
 {label:'Rooming List',flag:'roomingPending'},
 {label:'Heure arrivée',flag:'arrivalTimePending'},
 {label:'Heure départ',flag:'departureTimePending'},
 {label:'Prénom',field:'leaderFirstName'},
 {label:'Nom',field:'leaderLastName'},
 {label:'Téléphone',field:'leaderPhone'},
 {label:'Adresse e-mail',field:'leaderEmail'},
];

function selectedGroupId(data:Group360Record[]){const code=document.querySelector<HTMLElement>('.group-code')?.textContent?.trim().toLowerCase()||'';return data.find(group=>group.id.toLowerCase().startsWith(code))?.id||''}

export function Group360PendingInfoHelper(){
 const store=useOperationalStore<Group360Record[]>('group-360',[]);
 useEffect(()=>{
  if(!window.location.pathname.includes('/groupes'))return;
  const render=()=>{
   document.querySelectorAll<HTMLElement>('.group-detail .group-fields label').forEach(label=>{
    if(label.querySelector('.group-pending-helper'))return;
    const raw=(label.childNodes[0]?.textContent||label.textContent||'').trim();
    const target=targets.find(item=>raw.startsWith(item.label));if(!target)return;
    const wrap=document.createElement('span');wrap.className='group-pending-helper';
    const button=document.createElement('button');button.type='button';button.className='group-pending-button';button.textContent='À venir';
    button.title='Indiquer que cette information sera communiquée ultérieurement';
    button.onclick=()=>{
     const id=selectedGroupId(store.data);if(!id)return;
     const next=store.data.map(group=>{
      if(group.id!==id)return group;
      const update:Group360Record={...group,commercialValidated:false,validatedAt:'',validatedBy:''};
      if(target.field)update[target.field]='À venir';
      if(target.flag)update[target.flag]=true;
      return update;
     });
     void store.save(next);
    };
    wrap.appendChild(button);label.appendChild(wrap);
   });
   const id=selectedGroupId(store.data),group=store.data.find(item=>item.id===id);
   if(group){
    const labels=Array.from(document.querySelectorAll<HTMLElement>('.group-detail .group-fields label'));
    const badges:[string,boolean][]=[['Rooming List',Boolean(group.roomingPending)],['Heure arrivée',Boolean(group.arrivalTimePending)],['Heure départ',Boolean(group.departureTimePending)]];
    badges.forEach(([text,active])=>{const label=labels.find(item=>(item.childNodes[0]?.textContent||'').trim().startsWith(text));if(!label)return;let badge=label.querySelector<HTMLElement>('.group-pending-badge');if(active&&!badge){badge=document.createElement('span');badge.className='group-pending-badge';badge.textContent='À venir';label.appendChild(badge)}else if(!active&&badge)badge.remove()});
   }
  };
  render();const observer=new MutationObserver(render);observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[store.data]);
 return null;
}
