import { useEffect } from 'react';

export function AdministrationRoleProfileBridge(){
 useEffect(()=>{
  if(!location.pathname.startsWith('/administration'))return;
  const sync=()=>{
   document.querySelectorAll<HTMLSelectElement>('select[name="baseRole"]').forEach(select=>{
    if(!Array.from(select.options).some(option=>option.value==='night_auditor')){
     const option=document.createElement('option');
     option.value='night_auditor';
     option.textContent='Veilleur de nuit — Centre de Commandement, plaintes, feuille de route, consignes et tâches';
     const commercial=Array.from(select.options).find(option=>option.value==='commercial');
     if(commercial)select.insertBefore(option,commercial);else select.appendChild(option);
    }
   });
  };
  sync();
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[]);
 return null;
}
