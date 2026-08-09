import { useMemo, useState } from 'react';
import { Bell, Check, ChevronRight, ClipboardList, FileText, Package, ShieldAlert, UsersRound, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type JournalEntry={id:string;at:string;actorId?:string;actor:string;role:string;service:string;namespace:string;source:string;action:string;reference?:string;priority?:string};
type NotificationKind='group'|'function'|'loan'|'complaint'|'instruction';
type ImportantNotification={id:string;kind:NotificationKind;title:string;action:string;actor:string;role:string;at:string;href:string;reference?:string};

function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function storageKey(userId:string){return`hospicore.notifications.important.seen.${userId}`}
function loadSeen(userId:string){try{return new Set<string>(JSON.parse(localStorage.getItem(storageKey(userId))||'[]'))}catch{return new Set<string>()}}
function saveSeen(userId:string,value:Set<string>){try{localStorage.setItem(storageKey(userId),JSON.stringify(Array.from(value).slice(-1000)))}catch{}}
function text(e:JournalEntry){return`${e.namespace||''} ${e.source||''} ${e.action||''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function classify(e:JournalEntry):ImportantNotification|null{
 const raw=text(e);
 let kind:NotificationKind|null=null,title='',href='';
 if(raw.includes('group-360')||raw.includes('groupe 360')||raw.includes('fiche groupe')){kind='group';title='Fiche Groupe 360°';href='/reception/groupes'}
 else if(raw.includes('weekly-planning')||raw.includes('fiche de fonction')||raw.includes('function-sheet')){kind='function';title='Fiche de fonction';href='/reception/fiche-fonction'}
 else if(raw.includes('operations-center')||raw.includes('loan')||raw.includes('pret')||raw.includes('prêt')){kind='loan';title='Prêt';href='/centre-operations'}
 else if(raw.includes('complaint')||raw.includes('plainte')){kind='complaint';title='Plainte client';href='/reception/plaintes'}
 else if(raw.includes('general-instructions')||raw.includes('consigne')||raw.includes('main courante')){kind='instruction';title='Consigne';href='/consignes-generales'}
 if(!kind)return null;
 return{id:e.id,kind,title,action:e.action||'Information mise à jour',actor:e.actor||'Utilisateur HospiCore',role:e.role||e.service||'Collaborateur',at:e.at,href,reference:e.reference};
}
function Icon({kind}:{kind:NotificationKind}){const C=kind==='group'?UsersRound:kind==='function'?FileText:kind==='loan'?Package:kind==='complaint'?ShieldAlert:ClipboardList;return <C size={18}/>}

export function UnifiedNotificationHost(){
 const journal=useOperationalStore<JournalEntry[]>('activity-journal',[],5000),s=session(),userId=String(s.user?.id||''),[open,setOpen]=useState(false),[seen,setSeen]=useState<Set<string>>(()=>loadSeen(userId));
 const items=useMemo(()=>journal.data.map(classify).filter((n):n is ImportantNotification=>Boolean(n)).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,100),[journal.data]);
 const unread=items.filter(i=>!seen.has(i.id));
 function mark(id:string){const next=new Set(seen);next.add(id);setSeen(next);saveSeen(userId,next)}
 function markAll(){const next=new Set(seen);items.forEach(i=>next.add(i.id));setSeen(next);saveSeen(userId,next)}
 if(!s.token||!userId)return null;
 return <div className="unified-notification-host">
  <button className={`unified-notification-bell${unread.length?' has-unread':''}`} onClick={()=>setOpen(v=>!v)} aria-label="Notifications importantes" title="Notifications importantes"><Bell size={21}/>{unread.length>0&&<b>{unread.length>99?'99+':unread.length}</b>}</button>
  {open&&<aside className="unified-notification-panel">
   <header><div><strong>Notifications</strong><small>Informations importantes HospiCore</small></div><button onClick={()=>setOpen(false)} aria-label="Fermer"><X size={18}/></button></header>
   <div className="unified-notification-filters"><span>Fiches Groupe</span><span>Fiches de fonction</span><span>Prêts</span><span>Plaintes</span><span>Consignes</span></div>
   <section>{items.length?items.map(item=><button key={item.id} className={`unified-notification-item ${seen.has(item.id)?'seen':'unread'}`} onClick={()=>{mark(item.id);location.href=item.href}}><div className={`unified-notification-icon ${item.kind}`}><Icon kind={item.kind}/></div><div className="unified-notification-copy"><div><strong>{item.title}</strong>{item.reference&&<em>{item.reference}</em>}</div><p>{item.action}</p><small>Par <b>{item.actor}</b> · {item.role}</small><time>{new Date(item.at).toLocaleString('fr-FR')}</time></div><ChevronRight size={17}/></button>):<p className="unified-notification-empty"><Check size={18}/>Aucune notification importante.</p>}</section>
   <footer>{unread.length>0&&<button onClick={markAll}><Check size={15}/>Tout marquer comme lu</button>}<button onClick={()=>location.href='/journal-exploitation'}>Voir le Journal Live</button></footer>
  </aside>}
 </div>;
}
