import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, CheckCircle2, ChevronRight, ClipboardList, FileText, ListChecks, MessageSquareWarning, Package, ShieldAlert, UsersRound, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type JournalEntry={id:string;at:string;actorId?:string;actor:string;role:string;service:string;namespace:string;source:string;action:string;reference?:string;priority?:string};
type NotificationKind='group'|'function'|'loan'|'complaint'|'cash'|'task';
type ImportantNotification={id:string;kind:NotificationKind;title:string;action:string;actor:string;role:string;at:string;href:string;reference?:string;pending?:boolean};
type Service='Réception'|'Commercial'|'Maintenance'|'Direction';
type Recipient={userId:string;name:string;service:Service};
type ReadReceipt={userId:string;name:string;service:Service;readAt:string};
type HandrailEntry={id:string;reference:string;message:string;targetServices:Service[];createdAt:string;authorId:string;authorName:string;authorRole:string;authorService:Service;directionPriority:boolean;recipients:Recipient[];readBy:ReadReceipt[]};
type CashDepartment='reception'|'restaurant'|'bar';
type CashDay={id:string;date:string;department:CashDepartment;cashier?:string;lockedAt?:string;lockedBy?:string;directionValidatedAt?:string;directionValidatedBy?:string};
type OperationalGroup={id:string;name?:string;status?:string;arrivalConfirmedAt?:string;arrivalConfirmedBy?:string;departureConfirmedAt?:string;departureConfirmedBy?:string};
type Complaint={id:string;client:string;room:string;category:string;description:string;status:string;createdAt:string;createdBy:string};
type Task={id:string;reference:string;title:string;description?:string;service:string;assignee:string;assigneeId?:string;assignmentType?:'user'|'service';createdAt?:string;history?:Array<{actor?:string;role?:string;at?:string;action?:string}>};

function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function storageKey(userId:string){return`hospicore.notifications.important.seen.${userId}`}
function loadSeen(userId:string){try{return new Set<string>(JSON.parse(localStorage.getItem(storageKey(userId))||'[]'))}catch{return new Set<string>()}}
function saveSeen(userId:string,value:Set<string>){try{localStorage.setItem(storageKey(userId),JSON.stringify(Array.from(value).slice(-1000)))}catch{}}
function normalized(value:string){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function text(e:JournalEntry){return normalized(`${e.namespace||''} ${e.source||''} ${e.action||''}`)}
function serviceForRole(value:string):Service{const r=normalized(value);if(r.includes('direction')||r.includes('directeur')||r.includes('admin'))return'Direction';if(r.includes('commercial')||r.includes('vente'))return'Commercial';if(r.includes('maintenance')||r.includes('tech'))return'Maintenance';return'Réception'}
function cashDepartmentLabel(value:CashDepartment){return value==='restaurant'?'Restaurant':value==='bar'?'Bar':'Réception'}
function formatCashDate(value:string){const d=new Date(`${value}T12:00:00`);return Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR'):value}
function timestamp(value:string){const parsed=Date.parse(value);if(Number.isFinite(parsed))return parsed;const m=String(value||'').match(/(\d{2})\/(\d{2})\/(\d{4})[^\d]*(\d{2}):(\d{2})(?::(\d{2}))?/);return m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0)).getTime():0}
function dayKey(value:number){const d=new Date(value);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function todayKey(){return dayKey(Date.now())}
function cashNotificationId(cash:CashDay){return`cash-validation-${cash.id}-${String(cash.directionValidatedAt||'').replace(/[^0-9]/g,'')}`}
function cashReviewNotificationId(cash:CashDay){return`cash-review-${cash.id}-${String(cash.lockedAt||'').replace(/[^0-9]/g,'')}`}
function cashNotification(cash:CashDay):ImportantNotification|null{if(!cash.directionValidatedAt)return null;const department=cashDepartmentLabel(cash.department),date=formatCashDate(cash.date);return{id:cashNotificationId(cash),kind:'cash',title:'Caisse validée',action:`Caisse ${department} du ${date} validée`,actor:cash.directionValidatedBy||'Direction',role:'Direction',at:cash.directionValidatedAt,href:`/reception/caisse?department=${cash.department}&date=${cash.date}`,reference:`${department} · ${date}`}}
function cashReviewNotification(cash:CashDay):ImportantNotification|null{if(!cash.lockedAt||cash.directionValidatedAt)return null;const department=cashDepartmentLabel(cash.department),date=formatCashDate(cash.date);return{id:cashReviewNotificationId(cash),kind:'cash',title:'Caisse à valider',action:`Caisse ${department} du ${date} prête pour validation Direction`,actor:cash.lockedBy||cash.cashier||department,role:'Caisse',at:cash.lockedAt,href:`/reception/caisse?department=${cash.department}&date=${cash.date}`,reference:`${department} · ${date}`,pending:true}}
function meaningfulAction(raw:string,kind:NotificationKind){
 if(raw.includes('synchronis')||raw.includes('mise a jour')||raw.includes('mis a jour')||raw.includes('enregistr')||raw.includes('actualis'))return false;
 if(kind==='group')return raw.includes('valide')||raw.includes('revalide')||raw.includes('verrouille')||raw.includes('parti')||raw.includes('arrive');
 if(kind==='function')return raw.includes('diffuse')||raw.includes('imprime')||raw.includes('valide')||raw.includes('prete a imprimer')||raw.includes('cloture');
 if(kind==='loan')return raw.includes('cree')||raw.includes('attribue')||raw.includes('remis')||raw.includes('retour')||raw.includes('termine')||raw.includes('en retard');
 if(kind==='cash')return raw.includes('caisse')&&raw.includes('validee');
 if(kind==='complaint')return raw.includes('cree')||raw.includes('ouverte')||raw.includes('traitee')||raw.includes('resolue')||raw.includes('cloturee');
 return raw.includes('cree')||raw.includes('assigne')||raw.includes('termine');
}
function classify(e:JournalEntry):ImportantNotification|null{
 const raw=text(e);let kind:NotificationKind|null=null,title='',href='';
 if(raw.includes('cash-validation')||raw.includes('caisse journaliere')||raw.includes('caisse journalière')){kind='cash';title='Caisse validée';href='/reception/caisse';}
 else if(raw.includes('group-360')||raw.includes('groupe 360')||raw.includes('fiche groupe')){kind='group';title=raw.includes('revalide')?'Fiche Groupe 360° revalidée':raw.includes('parti')?'Groupe passé en départ':raw.includes('arrive')?'Groupe passé en arrivée':'Fiche Groupe 360° validée';href='/reception/groupes';}
 else if(raw.includes('weekly-planning')||raw.includes('fiche de fonction')||raw.includes('function-sheet')){kind='function';title='Fiche de fonction';href='/reception/fiche-fonction';}
 else if(raw.includes('operations-center')||raw.includes('loan')||raw.includes('pret')||raw.includes('prêt')){kind='loan';title='Prêt';href='/centre-operations';}
 else if(raw.includes('complaint')||raw.includes('plainte')){kind='complaint';title='Plainte client';href='/reception/plaintes';}
 else if(raw.includes('tasks')||raw.includes('tache')||raw.includes('tâche')){kind='task';title='Tâche';href='/taches';}
 if(!kind||!meaningfulAction(raw,kind))return null;
 return{id:e.id,kind,title,action:e.action||'Information importante',actor:e.actor||'Utilisateur HospiCore',role:e.role||e.service||'Collaborateur',at:e.at,href,reference:e.reference};
}
function groupNotifications(group:OperationalGroup):ImportantNotification[]{const result:ImportantNotification[]=[];if(group.arrivalConfirmedAt)result.push({id:`group-arrival-${group.id}-${timestamp(group.arrivalConfirmedAt)}`,kind:'group',title:'Groupe mis en arrivée',action:`${group.name||'Groupe'} est désormais présent dans l’hôtel`,actor:group.arrivalConfirmedBy||'Réception',role:'Réception',at:group.arrivalConfirmedAt,href:'/reception/arrivees-departs',reference:group.name||group.id});if(group.departureConfirmedAt)result.push({id:`group-departure-${group.id}-${timestamp(group.departureConfirmedAt)}`,kind:'group',title:'Groupe mis en départ',action:`${group.name||'Groupe'} a quitté l’hôtel`,actor:group.departureConfirmedBy||'Réception',role:'Réception',at:group.departureConfirmedAt,href:'/reception/arrivees-departs',reference:group.name||group.id});return result}
function complaintNotification(item:Complaint):ImportantNotification{return{id:`complaint-created-${item.id}`,kind:'complaint',title:'Nouvelle plainte déposée',action:`${item.client||'Client'}${item.room?` · chambre ${item.room}`:''} · ${item.category}`,actor:item.createdBy||'Réception',role:'Réception',at:item.createdAt,href:'/reception/plaintes',reference:item.room?`Chambre ${item.room}`:item.client||item.id}}
function taskNotification(item:Task):ImportantNotification|null{if(!item.createdAt)return null;const first=item.history?.[0];return{id:`task-created-${item.id}`,kind:'task',title:'Nouvelle tâche créée',action:`${item.reference} · ${item.title}${item.assignee?` · assignée à ${item.assignee}`:''}`,actor:first?.actor||'HospiCore',role:first?.role||item.service||'Coordination',at:item.createdAt,href:'/taches',reference:item.reference}}
function taskVisibleToUser(item:Task,userId:string,userService:Service){if(item.assignmentType==='user'||item.assigneeId)return item.assigneeId===userId;return !item.service||normalized(item.service)===normalized(userService)||userService==='Direction'}
function Icon({kind}:{kind:NotificationKind}){const C=kind==='group'?UsersRound:kind==='function'?FileText:kind==='loan'?Package:kind==='cash'?CheckCircle2:kind==='task'?ListChecks:MessageSquareWarning;return <C size={18}/>}
function dedupe(items:ImportantNotification[]){const seen=new Set<string>();return items.filter(item=>{const explicit=/^(cash-|group-arrival-|group-departure-|complaint-created-|task-created-)/.test(item.id)?item.id:'';const minute=Math.floor(timestamp(item.at)/60000);const key=explicit||[item.kind,item.reference||'',normalized(item.action),normalized(item.actor),minute].join('|');if(seen.has(key))return false;seen.add(key);return true})}

function CashValidatedBanner({cashDays}:{cashDays:CashDay[]}){
 const[pathTarget,setPathTarget]=useState<Element|null>(null);
 useEffect(()=>{if(!location.pathname.startsWith('/reception/caisse')){setPathTarget(null);return}let cancelled=false;const resolve=()=>{if(cancelled)return;const target=document.querySelector('.cash-sheet');if(target)setPathTarget(target);else window.setTimeout(resolve,120)};resolve();return()=>{cancelled=true}},[]);
 if(!pathTarget)return null;
 const params=new URLSearchParams(location.search),department=(params.get('department')||'reception') as CashDepartment,date=params.get('date')||'';
 const current=cashDays.find(c=>c.department===department&&(!date||c.date===date));
 if(!current?.directionValidatedAt)return null;
 return createPortal(<div style={{margin:'0 0 14px',padding:'12px 16px',border:'1px solid #a8d5b5',borderRadius:'12px',background:'#edf8f0',color:'#176b36',display:'flex',alignItems:'center',gap:'10px',fontWeight:800}}><CheckCircle2 size={19}/><span>Caisse validée · {cashDepartmentLabel(current.department)} · {formatCashDate(current.date)}</span><small style={{marginLeft:'auto',fontWeight:600,opacity:.8}}>par {current.directionValidatedBy||'Direction'} · {new Date(current.directionValidatedAt).toLocaleString('fr-FR')}</small></div>,pathTarget);
}

export function UnifiedNotificationHost(){
 const journal=useOperationalStore<JournalEntry[]>('activity-journal',[],5000);
 const instructions=useOperationalStore<HandrailEntry[]>('general-instructions',[]);
 const cashStore=useOperationalStore<CashDay[]>('reception-cash-day',[]);
 const groups=useOperationalStore<OperationalGroup[]>('group-360',[]);
 const complaints=useOperationalStore<Complaint[]>('client-complaints',[]);
 const tasks=useOperationalStore<Task[]>('tasks',[]);
 const s=session(),userId=String(s.user?.id||''),[open,setOpen]=useState(false),[seen,setSeen]=useState<Set<string>>(()=>loadSeen(userId));
 const userName=`${s.user?.firstName||'Utilisateur'} ${s.user?.lastName||'HospiCore'}`.trim(),userRole=String(s.user?.role?.baseRole||s.user?.role?.name||s.user?.role||''),userService=serviceForRole(userRole),today=todayKey();
 useEffect(()=>{setSeen(loadSeen(userId))},[userId]);
 const items=useMemo(()=>{
  const journalItems=journal.data.map(classify).filter((n):n is ImportantNotification=>Boolean(n));
  const cashDays=Array.isArray(cashStore.data)?cashStore.data:[];
  const cashItems=cashDays.map(cashNotification).filter((n):n is ImportantNotification=>Boolean(n));
  const directionReviewItems=userService==='Direction'?cashDays.map(cashReviewNotification).filter((n):n is ImportantNotification=>Boolean(n)):[];
  const groupItems=(groups.data||[]).flatMap(groupNotifications);
  const complaintItems=(complaints.data||[]).map(complaintNotification);
  const taskItems=(tasks.data||[]).filter(t=>taskVisibleToUser(t,userId,userService)).map(taskNotification).filter((n):n is ImportantNotification=>Boolean(n));
  return dedupe([...directionReviewItems,...cashItems,...groupItems,...complaintItems,...taskItems,...journalItems]).filter(n=>n.pending||dayKey(timestamp(n.at))===today).sort((a,b)=>Number(Boolean(b.pending))-Number(Boolean(a.pending))||timestamp(b.at)-timestamp(a.at)).slice(0,150)
 },[journal.data,cashStore.data,groups.data,complaints.data,tasks.data,today,userId,userService]);
 const unread=items.filter(i=>!seen.has(i.id));
 const instructionToday=useMemo(()=>instructions.data.filter(i=>(userService==='Direction'||(Array.isArray(i.recipients)&&i.recipients.some(r=>r.userId===userId)))&&dayKey(Date.parse(i.createdAt))===today).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)),[instructions.data,userId,userService,today]);
 const instructionInbox=instructionToday.filter(i=>!(i.readBy||[]).some(r=>r.userId===userId));
 const totalUnread=unread.length+instructionInbox.length;
 useEffect(()=>{if(!userId||!instructionInbox.length)return;const key=`hospicore.instructions.inbox.opened.${userId}.${today}`;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');setOpen(true)},[userId,instructionInbox.length,today]);
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};document.body.style.overflow='hidden';document.addEventListener('keydown',onKey);return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKey)}},[open]);
 function mark(id:string){const next=new Set(seen);next.add(id);setSeen(next);saveSeen(userId,next)}
 function markAll(){const next=new Set(seen);items.forEach(i=>next.add(i.id));setSeen(next);saveSeen(userId,next)}
 async function markInstructionRead(entry:HandrailEntry){if((entry.readBy||[]).some(r=>r.userId===userId))return;const receipt:ReadReceipt={userId,name:userName,service:userService,readAt:new Date().toISOString()};await instructions.save(instructions.data.map(i=>i.id===entry.id?{...i,readBy:[...(i.readBy||[]),receipt]}:i))}
 if(!s.token||!userId)return null;
 const panel=open?createPortal(<div className="unified-notification-overlay" onMouseDown={()=>setOpen(false)}><aside className="unified-notification-panel" onMouseDown={event=>event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Boîte de réception">
 <header><div><strong>Boîte de réception</strong><small>Actions importantes réelles de la journée · les éléments lus restent visibles</small></div><button onClick={()=>setOpen(false)} aria-label="Fermer"><X size={18}/></button></header>
 <div className="unified-notification-scroll">
 {instructionToday.length>0&&<div className="instruction-inbox-block"><div className="instruction-inbox-heading"><ClipboardList size={18}/><div><strong>Nouvelles consignes</strong><small>{instructionInbox.length} non lue(s) · {instructionToday.length} publiée(s) aujourd’hui</small></div></div>{instructionToday.map(entry=>{const read=(entry.readBy||[]).some(r=>r.userId===userId);return <article className={`instruction-inbox-item${entry.directionPriority?' priority':''}${read?' read':''}`} key={entry.id}><div className="instruction-inbox-copy"><div><strong>{entry.reference}</strong>{entry.directionPriority&&<span>Direction</span>}{read&&<span className="read-state">Lu</span>}</div><p>{entry.message}</p><small>Consigne créée par <b>{entry.authorName}</b> · {entry.authorRole}</small><time>{new Date(entry.createdAt).toLocaleString('fr-FR')}</time></div>{!read&&<button onClick={()=>void markInstructionRead(entry)}><Check size={15}/>Lu</button>}</article>})}</div>}
 <div className="unified-notification-filters"><span>Arrivées / départs</span><span>Tâches</span><span>Plaintes</span><span>Consignes</span><span>Caisses</span><span>Documents</span></div>
 <section>{items.length?items.map(item=>{const read=seen.has(item.id);return <button key={item.id} className={`unified-notification-item ${read?'seen':'unread'}${item.pending?' pending':''}`} onClick={()=>{mark(item.id);location.href=item.href}}><div className={`unified-notification-icon ${item.kind}`}><Icon kind={item.kind}/></div><div className="unified-notification-copy"><div><strong>{item.title}</strong>{item.reference&&<em>{item.reference}</em>}{item.pending&&<em>À traiter</em>}{read&&<em className="notification-read-state">Lu</em>}</div><p>{item.action}</p><small>Par <b>{item.actor}</b> · {item.role}</small><time>{new Date(timestamp(item.at)).toLocaleString('fr-FR')}</time></div><ChevronRight size={17}/></button>}):<p className="unified-notification-empty"><Check size={18}/>Aucune action importante enregistrée aujourd’hui.</p>}</section>
 </div>
 <footer>{unread.length>0&&<button onClick={markAll}><Check size={15}/>Marquer les notifications comme lues</button>}<button onClick={()=>location.href='/consignes-generales'}>Voir les consignes</button></footer>
 </aside></div>,document.body):null;
 return <><CashValidatedBanner cashDays={Array.isArray(cashStore.data)?cashStore.data:[]}/><div className="unified-notification-host"><button className={`unified-notification-bell${totalUnread?' has-unread':''}`} onClick={()=>setOpen(v=>!v)} aria-label="Boîte de réception" title="Boîte de réception"><Bell size={21}/>{totalUnread>0&&<b>{totalUnread>99?'99+':totalUnread}</b>}</button></div>{panel}</>;
}
