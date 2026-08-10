import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { History, MessageSquareWarning, MoonStar } from 'lucide-react';
import { currentRole } from './permissions';

export function NightAuditorNav(){
 const[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{const find=()=>setHost(document.querySelector<HTMLElement>('.nav-list'));find();const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[]);
 if(!host||currentRole()!=='night_auditor')return null;
 const item=(href:string,label:string,Icon:typeof History)=><button className={`nav-item${location.pathname===href?' active':''}`} onClick={()=>location.assign(href)}><Icon size={18}/><span>{label}</span></button>;
 return createPortal(<div className="night-auditor-nav"><div className="nav-item night-auditor-title"><MoonStar size={18}/><span>Service de nuit</span></div>{item('/reception/plaintes','Plaintes',MessageSquareWarning)}{item('/reception/feuille-route-veilleur','Feuille de route veilleur',History)}</div>,host);
}
