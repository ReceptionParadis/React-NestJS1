import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PackageCheck } from 'lucide-react';
import { canAccessPath, currentRole } from './permissions';

export function ReceptionMealNav(){
 const[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{const find=()=>setHost(document.querySelector<HTMLElement>('.reception-nav-group .nav-submenu'));find();const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[]);
 if(!host||!canAccessPath('/reception/paniers-repas-pdj',currentRole()))return null;
 return createPortal(<button className={`nav-subitem${location.pathname==='/reception/paniers-repas-pdj'?' active':''}`} onClick={()=>location.assign('/reception/paniers-repas-pdj')}><PackageCheck size={16}/><span>Paniers repas & PDJ Box</span></button>,host);
}
