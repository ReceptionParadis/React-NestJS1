import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareWarning } from 'lucide-react';
import { canAccessPath, currentRole } from './permissions';

export function ReceptionComplaintsNav(){
 const[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{const find=()=>setHost(document.querySelector<HTMLElement>('.reception-nav-group .nav-submenu'));find();const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[]);
 if(!host||!canAccessPath('/reception/plaintes',currentRole()))return null;
 return createPortal(<button className={`nav-subitem${location.pathname==='/reception/plaintes'?' active':''}`} onClick={()=>location.assign('/reception/plaintes')}><MessageSquareWarning size={16}/><span>Plaintes</span></button>,host);
}
