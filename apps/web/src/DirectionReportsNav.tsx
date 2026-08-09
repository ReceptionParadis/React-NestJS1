import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText } from 'lucide-react';
import { canAccessPath, currentRole } from './permissions';

export function DirectionReportsNav(){
 const[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{const find=()=>setHost(document.querySelector<HTMLElement>('.nav-list'));find();const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[]);
 if(!host||!canAccessPath('/rapports-direction',currentRole()))return null;
 return createPortal(<button data-nav="/rapports-direction" className={`nav-item${location.pathname.startsWith('/rapports-direction')?' active':''}`} onClick={()=>location.assign('/rapports-direction')}><FileText size={19}/><span>Rapports Direction</span></button>,host);
}
