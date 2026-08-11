import { useEffect } from 'react';
import { can } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type GroupControl={locked?:boolean;validatedAt?:string;validatedBy?:string;commercialValidation?:'À valider'|'Validé';[key:string]:unknown};
type Group={id:string;name?:string;groupControl?:GroupControl;audit?:Array<{id:string;action:string;actor:string;role:string;at:string}>};
function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')?.user||{}}catch{return{}}}
function actor(){const u=session();return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:String(u.role?.name||u.role||'Collaborateur')}}
function normalize(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}

export function GroupControlUnlockPermissionBridge(){
 const store=useOperationalStore<Group[]>('group-360',[]);
 useEffect(()=>{
  if(!location.pathname.startsWith('/reception/controles')||!can('group-control.unlock'))return;
  let busy=false;
  const attach=()=>{
   const modal=document.querySelector<HTMLElement>('.group-control-modal');if(!modal)return;
   const lock=modal.querySelector<HTMLElement>('.group-control-lock');if(!lock)return;
   const title=modal.querySelector<HTMLElement>('.group-control-title h2')?.textContent?.trim()||'';
   const group=store.data.find(g=>normalize(g.name||'')===normalize(title));
   if(!group?.groupControl?.locked)return;
   if(lock.querySelector('[data-permission-unlock="true"]')||Array.from(lock.querySelectorAll('button')).some(b=>normalize(b.textContent||'').includes('deverrouiller')))return;
   const button=document.createElement('button');button.type='button';button.dataset.permissionUnlock='true';button.textContent='Déverrouiller pour modifier';
   button.addEventListener('click',async()=>{
    if(busy)return;busy=true;button.disabled=true;
    try{
     const who=actor(),now=new Date().toLocaleString('fr-FR');
     const next=store.data.map(g=>g.id===group.id?{...g,groupControl:{...(g.groupControl||{}),locked:false,commercialValidation:'À valider'},audit:[...(g.audit||[]),{id:crypto.randomUUID(),action:'Contrôle Groupe déverrouillé pour modification',actor:who.name,role:who.role,at:now}]}:g);
     await store.save(next);
    }finally{busy=false;button.disabled=false}
   });
   lock.appendChild(button);
  };
  attach();const observer=new MutationObserver(attach);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
 },[store.data,store.version]);
 return null;
}
