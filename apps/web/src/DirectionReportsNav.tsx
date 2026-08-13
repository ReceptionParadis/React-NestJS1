import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText } from 'lucide-react';
import { canAccessPath, currentRole } from './permissions';

export function DirectionReportsNav(){
 const[host,setHost]=useState<HTMLElement|null>(null);
 const allowed=canAccessPath('/rapports-direction',currentRole());
 useEffect(()=>{
  if(!allowed)return;
  void fetch('/api/operational-sync/direction-report/ensure',{credentials:'same-origin'}).catch(()=>undefined);
  let attempts=0;
  const find=()=>{
   const next=document.querySelector<HTMLElement>('.nav-list');
   if(next){setHost(next);return true}
   return false;
  };
  if(find())return;
  const timer=window.setInterval(()=>{attempts+=1;if(find()||attempts>=20)window.clearInterval(timer)},150);
  return()=>window.clearInterval(timer);
 },[allowed]);
 if(!allowed||!host)return null;
 if(host.querySelector('[data-nav="/rapports-direction"]'))return null;
 return createPortal(<button data-nav="/rapports-direction" className={`nav-item${location.pathname.startsWith('/rapports-direction')?' active':''}`} onClick={()=>location.assign('/rapports-direction')}><FileText size={19}/><span>Rapports Direction</span></button>,host);
}
