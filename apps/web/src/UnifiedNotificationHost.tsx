import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, ChevronRight, ClipboardList, FileText, Package, ShieldAlert, UsersRound, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type JournalEntry={id:string;at:string;actorId?:string;actor:string;role:string;service:string;namespace:string;source:string;action:string;reference?:string;priority?:string};
type NotificationKind='group'|'function'|'loan'|'complaint';
type ImportantNotification={id:string;kind:NotificationKind;title:string;action:string;actor:string;role:string;at:string;href:string;reference?:string};
type Service='Réception'|'Commercial'|'Maintenance'|'Direction';
type Recipient={userId:string;name:string;service:Service};
type ReadReceipt={userId:string;name:string;service:Service;readAt:string};
type HandrailEntry={id:string;reference:string;message:string;targetServices:Service[];createdAt:string;authorId:string;authorName:string;authorRole:string;authorService:Service;directionPriority:boolean;recipients:Recipient[];readBy:ReadReceipt[]};

function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function storageKey(userId:string){return`hospicore.notifications.important.seen.${userId}`}
function loadSeen(userId:string){try{return new Set<string>(JSON.parse(localStorage.getItem(storageKey(userId))||'[]'))}catch{return new Set<string>()}}
function saveSeen(userId:string,value:Set<string>){try{localStorage.setItem(storageKey(userId),JSON.stringify(Array.from(value).slice(-1000)))}catch{}}
function text(e:JournalEntry){return`${e.namespace||''} ${e.source||''} ${e.action||''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function serviceForRole(value:string):Service{const r=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(r.includes('direction')||r.includes('directeur')||r.includes('admin'))return'Direction';if(r.includes('commercial')||r.includes('vente'))return'Commercial';if(r.includes('maintenance')||r.includes('tech'))return'Maintenance';return'Réception'}
function classify(e:JournalEntry):ImportantNotification|null{
 const raw=text(e);
 let kind:NotificationKind|null=null,title='',href='';
 if(raw.includes('group-360')||raw.includes('groupe 360')||raw.includes('fiche groupe')){kind='group';title='Fiche Groupe 360°';href='/reception/groupes'}
 else if(raw.includes('weekly-planning')||raw.includes('fiche de fonction')||raw.includes('function-sheet')){kind='function';title='Fiche de fonction';href='/reception/fiche-fonction'}
 else if(raw.includes('operations-center')||raw.includes('loan')||raw.includes('pret')||raw.includes('prêt')){kind='loan';title='Prêt';href='/centre-operations'}
 else if(raw.includes('complaint')||raw.includes('plainte')){kind='complaint';title='Plainte client';href='/reception/plaintes'}
 if(!kind)return null;
 return{id:e.id,kind,title,action:e.action||'Information mise à jour',actor:e.actor||'Utilisateur HospiCore',role:e.role||e.service||'Collaborateur',at:e.at,href,reference:e.reference};
}
function Icon({kind}:{kind:NotificationKind}){const C=kind==='group'?UsersRound:kind==='function'?FileText:kind==='loan'?Package:ShieldAlert;return <C size={18}/>}

export function UnifiedNotificationHost(){
 const journal=useOperationalStore<JournalEntry[]>('activity-journal',[],5000),instructions=useOperationalStore<HandrailEntry[]>('general-instructions',[]),s=session(),userId=String(s.user?.id||''),[open,setOpen]=useState(false),[seen,setSeen]=useState<Set<string>>(()=>loadSeen(userId));
 const userName=`${s.user?.firstName||'Utilisateur'} ${s.user?.lastName||'HospiCore'}`.trim(),userRole=String(s.user?.role?.baseRole||s.user?.role?.name||s.user?.role||''),userService=serviceForRole(userRole);
 const items=useMemo(()=>journal.data.map(classify).filter((n):n is ImportantNotification=>Boolean(n)).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,100),[journal.data]);
 const unread=items.filter(i=>!seen.has(i.id));
 const instructionInbox=useMemo(()=>instructions.data
  .filter(i=>(userService==='Direction'||(Array.isArray(i.recipients)&&i.recipients.some(r=>r.userId===userId)))&&!(i.readBy||[]).some(r=>r.userId===userId))
  .sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)),[instructions.data,userId,userService]);
 const totalUnread=unread.length+instructionInbox.length;
 useEffect(()=>{
  if(!userId||!instructionInbox.length)return;
  const key=`hospicore.instructions.inbox.opened.${userId}`;
  if(sessionStorage.getItem(key))return;
  sessionStorage.setItem(key,'1');setOpen(true);
 },[userId,instructionInbox.length]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
  document.body.style.overflow='hidden';
  document.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKey)};
 },[open]);
 function mark(id:string){const next=new Set(seen);next.add(id);setSeen(next);saveSeen(userId,next)}
 function markAll(){const next=new Set(seen);items.forEach(i=>next.add(i.id));setSeen(next);saveSeen(userId,next)}
 async function markInstructionRead(entry:HandrailEntry){if((entry.readBy||[]).some(r=>r.userId===userId))return;const receipt:ReadReceipt={userId,name:userName,service:userService,readAt:new Date().toISOString()};await instructions.save(instructions.data.map(i=>i.id===entry.id?{...i,readBy:[...(i.readBy||[]),receipt]}:i))}
 if(!s.token||!userId)return null;
 const panel=open?createPortal(<div className="unified-notification-overlay" onMouseDown={()=>setOpen(false)}><aside className="unified-notification-panel" onMouseDown={event=>event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Boîte de réception">
   <header><div><strong>Boîte de réception</strong><small>Consignes et informations importantes pour votre compte</small></div><button onClick={()=>setOpen(false)} aria-label="Fermer"><X size={18}/></button></header>
   <div className="unified-notification-scroll">
    {instructionInbox.length>0&&<div className="instruction-inbox-block"><div className="instruction-inbox-heading"><ClipboardList size={18}/><div><strong>Consignes à lire</strong><small>{instructionInbox.length} information{instructionInbox.length>1?'s':''} en attente de prise de connaissance</small></div></div>{instructionInbox.map(entry=><article className={`instruction-inbox-item${entry.directionPriority?' priority':''}`} key={entry.id}><div className="instruction-inbox-copy"><div><strong>{entry.reference}</strong>{entry.directionPriority&&<span>Direction</span>}</div><p>{entry.message}</p><small>Par <b>{entry.authorName}</b> · {entry.authorRole}</small><time>{new Date(entry.createdAt).toLocaleString('fr-FR')}</time></div><button onClick={()=>void markInstructionRead(entry)}><Check size={15}/>Lu</button></article>)}</div>}
    <div className="unified-notification-filters"><span>Fiches Groupe</span><span>Fiches de fonction</span><span>Prêts</span><span>Plaintes</span><span>Consignes nominatives</span></div>
    <section>{items.length?items.map(item=><button key={item.id} className={`unified-notification-item ${seen.has(item.id)?'seen':'unread'}`} onClick={()=>{mark(item.id);location.href=item.href}}><div className={`unified-notification-icon ${item.kind}`}><Icon kind={item.kind}/></div><div className="unified-notification-copy"><div><strong>{item.title}</strong>{item.reference&&<em>{item.reference}</em>}</div><p>{item.action}</p><small>Par <b>{item.actor}</b> · {item.role}</small><time>{new Date(item.at).toLocaleString('fr-FR')}</time></div><ChevronRight size={17}/></button>):<p className="unified-notification-empty"><Check size={18}/>Aucune autre notification importante.</p>}</section>
   </div>
   <footer>{unread.length>0&&<button onClick={markAll}><Check size={15}/>Marquer les notifications comme lues</button>}<button onClick={()=>location.href='/consignes-generales'}>Voir les consignes</button></footer>
  </aside></div>,document.body):null;
 return <><div className="unified-notification-host"><button className={`unified-notification-bell${totalUnread?' has-unread':''}`} onClick={()=>setOpen(v=>!v)} aria-label="Boîte de réception" title="Boîte de réception"><Bell size={21}/>{totalUnread>0&&<b>{totalUnread>99?'99+':totalUnread}</b>}</button></div>{panel}</>;
}
