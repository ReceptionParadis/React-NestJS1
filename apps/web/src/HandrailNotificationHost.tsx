import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ShieldAlert, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type Service='Réception'|'Commercial'|'Maintenance'|'Direction';
type Recipient={userId:string;name:string;service:Service};
type ReadReceipt={userId:string;name:string;service:Service;readAt:string};
type Entry={id:string;reference:string;message:string;targetServices:Service[];createdAt:string;authorName:string;authorRole:string;authorService:Service;directionPriority:boolean;recipients:Recipient[];readBy:ReadReceipt[]};
function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function serviceForRole(value:string):Service{const r=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(r.includes('direction')||r.includes('directeur')||r.includes('admin'))return'Direction';if(r.includes('commercial')||r.includes('vente'))return'Commercial';if(r.includes('maintenance')||r.includes('tech'))return'Maintenance';return'Réception'}

export function HandrailNotificationHost(){
 const store=useOperationalStore<Entry[]>('general-instructions',[],5000),s=session(),u=s.user||{},userId=String(u.id||''),name=`${u.firstName||'Utilisateur'} ${u.lastName||''}`.trim(),service=serviceForRole(String(u.role?.baseRole||u.role?.name||u.role||''));
 const[open,setOpen]=useState(false),[flash,setFlash]=useState(false),previousCount=useRef<number|null>(null);
 const unread=useMemo(()=>store.data.filter(e=>e.directionPriority&&Array.isArray(e.recipients)&&e.recipients.some(r=>r.userId===userId)&&!(e.readBy||[]).some(r=>r.userId===userId)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),[store.data,userId]);
 useEffect(()=>{if(previousCount.current!==null&&unread.length>previousCount.current){setFlash(true);const timer=window.setTimeout(()=>setFlash(false),5000);return()=>window.clearTimeout(timer)}previousCount.current=unread.length},[unread.length]);
 async function markRead(entry:Entry){const receipt:ReadReceipt={userId,name,service,readAt:new Date().toISOString()};await store.save(store.data.map(e=>e.id===entry.id?{...e,readBy:[...(e.readBy||[]),receipt]}:e))}
 if(!s.token||!userId||!unread.length)return null;
 return <div className={`handrail-notification-host${flash?' flash':''}`}><button className="handrail-notification-bell" onClick={()=>setOpen(v=>!v)} title="Informations Direction à lire"><ShieldAlert size={20}/><b>{unread.length>99?'99+':unread.length}</b></button>{open&&<aside className="handrail-notification-panel"><header><div><strong>Information Direction</strong><small>{unread.length} information{unread.length>1?'s':''} à lire</small></div><button onClick={()=>setOpen(false)}><X size={17}/></button></header><div>{unread.slice(0,8).map(entry=><article key={entry.id}><div><strong>{entry.authorName}</strong><small>{new Date(entry.createdAt).toLocaleString('fr-FR')} · {entry.targetServices.join(', ')}</small></div><p>{entry.message}</p><footer><button onClick={()=>{void markRead(entry);setOpen(false)}}><Check size={15}/>Lu</button><button onClick={()=>location.href='/consignes-generales'}>Ouvrir la main courante</button></footer></article>)}</div></aside>}</div>;
}
