import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText } from 'lucide-react';
import { canAccessPath, currentRole } from './permissions';

export function DirectionReportsNav(){
 const[host,setHost]=useState<HTMLElement|null>(null);
 const allowed=canAccessPath('/rapports-direction',currentRole());
 useEffect(()=>{
  if(!allowed){setHost(null);return;}
  void fetch('/api/operational-sync/direction-report/ensure',{credentials:'same-origin'}).catch(()=>undefined);
  const find=()=>{
   const next=document.querySelector<HTMLElement>('.nav-list');
   setHost(current=>current===next&&current?.isConnected?current:next);
  };
  find();
  const timer=window.setInterval(find,1000);
  return()=>window.clearInterval(timer);
 },[allowed]);
 if(!allowed||!host||!host.isConnected)return null;
 if(host.querySelector('[data-nav="/rapports-direction"]'))return null;
 return createPortal(<button data-nav="/rapports-direction" className={`nav-item${location.pathname.startsWith('/rapports-direction')?' active':''}`} onClick={()=>location.assign('/rapports-direction')}><FileText size={19}/><span>Rapports Direction</span></button>,host);
}
