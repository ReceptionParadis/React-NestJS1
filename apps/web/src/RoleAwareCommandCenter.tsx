import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, History, ListTodo, MessageSquareWarning, MoonStar } from 'lucide-react';
import { canAccessPath, currentRole } from './permissions';

function roleClass(){return `role-dashboard-${currentRole().replace(/_/g,'-')}`}

export function RoleAwareCommandCenter(){
 const[host,setHost]=useState<HTMLElement|null>(null);
 const role=currentRole();
 useEffect(()=>{
  if(window.location.pathname!=='/'&&window.location.pathname!=='')return;
  let mount:HTMLElement|null=null;
  const apply=()=>{
   const shell=document.querySelector<HTMLElement>('.command-shell');
   const content=document.querySelector<HTMLElement>('.command-content');
   if(!shell||!content)return false;
   Array.from(shell.classList).filter(c=>c.startsWith('role-dashboard-')).forEach(c=>shell.classList.remove(c));
   shell.classList.add(roleClass());
   shell.dataset.canReception=String(canAccessPath('/reception',role));
   shell.dataset.canCommercial=String(canAccessPath('/commercial',role));
   shell.dataset.canMaintenance=String(canAccessPath('/tickets',role));
   shell.dataset.canMeetings=String(canAccessPath('/salles-reunion',role));
   shell.dataset.canPlanning=String(canAccessPath('/planning-operationnel',role));
   shell.dataset.canJournal=String(canAccessPath('/journal-exploitation',role));
   if(role==='night_auditor'){
    mount=document.getElementById('night-command-shortcuts-mount');
    if(!mount){mount=document.createElement('div');mount.id='night-command-shortcuts-mount';const primary=content.querySelector('.command-grid.primary');primary?content.insertBefore(mount,primary):content.prepend(mount)}
    setHost(mount);
   }else setHost(null);
   return true;
  };
  if(apply())return()=>{mount?.remove()};
  const observer=new MutationObserver(()=>{if(apply())observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();mount?.remove()};
 },[role]);
 if(role!=='night_auditor'||!host)return null;
 return createPortal(<section className="night-command-home"><header><div className="night-command-home-icon"><MoonStar size={23}/></div><div><p>VEILLEUR DE NUIT · SERVICE EN COURS</p><h2>Poste de nuit</h2><span>Accès direct aux informations et actions utiles pendant votre service.</span></div></header><div className="night-command-links"><button onClick={()=>location.assign('/reception/feuille-route-veilleur')}><History size={20}/><span><strong>Feuille de route</strong><small>Informations consolidées 22h00–08h30</small></span></button><button onClick={()=>location.assign('/reception/plaintes')}><MessageSquareWarning size={20}/><span><strong>Plaintes</strong><small>Consulter et enregistrer les incidents clients</small></span></button><button onClick={()=>location.assign('/consignes-generales')}><ClipboardList size={20}/><span><strong>Consignes</strong><small>Informations à connaître pendant le service</small></span></button><button onClick={()=>location.assign('/taches')}><ListTodo size={20}/><span><strong>Mes tâches</strong><small>Actions affectées à votre compte</small></span></button></div></section>,host)
}
