import { useEffect } from 'react';

type SessionUser={id?:string;hotelId?:string;hotel?:{id?:string};firstName?:string;lastName?:string;role?:{name?:string}|string};
type Session={token?:string;accessToken?:string;user?:SessionUser};
type Group={id?:string;name?:string;arrival?:string;status?:string};
type ArrivalResponse={payload?:Group[];version?:number;updatedAt?:string};

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function session():Session{try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function tokenOf(current:Session){return current.token||current.accessToken||localStorage.getItem('hospicore.token')||localStorage.getItem('hospicore.accessToken')||''}
function actorOf(current:Session){const user=current.user||{},role=typeof user.role==='string'?user.role:user.role?.name||'Réception';return{name:`${user.firstName||'Utilisateur'} ${user.lastName||'HospiCore'}`.trim(),role}}
function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

export function GroupArrivalPersistenceBridge(){
 useEffect(()=>{
  if(!location.pathname.startsWith('/reception/arrivees-departs'))return;
  let busy=false;
  let channel:BroadcastChannel|null=null;
  if('BroadcastChannel'in window)channel=new BroadcastChannel('hospicore-sync-group-360');
  const onClick=(event:MouseEvent)=>{
   const button=(event.target as HTMLElement|null)?.closest<HTMLButtonElement>('button');
   if(!button||normalize(button.textContent||'')!=='mettre en arrivee'||busy)return;
   const card=button.closest<HTMLElement>('.reception-op-card');
   const groupName=card?.querySelector<HTMLElement>('.reception-op-identity strong')?.textContent?.trim()||'';
   if(!groupName)return;
   event.preventDefault();event.stopPropagation();
   busy=true;button.disabled=true;
   const current=session(),user=current.user||{},actor=actorOf(current),token=tokenOf(current),hotelId=user.hotelId||user.hotel?.id||'';
   const headers={'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};
   const params=new URLSearchParams();if(hotelId)params.set('hotelId',hotelId);if(user.id)params.set('userId',user.id);
   void fetch(`/api/operational-sync/group-360?${params.toString()}`,{headers,cache:'no-store'})
    .then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.message||`Lecture groupes impossible (${response.status})`);const groups=Array.isArray(data?.payload)?data.payload as Group[]:[];const wanted=groups.find(group=>normalize(String(group.name||''))===normalize(groupName)&&String(group.arrival||'')===todayIso()&&!['Arrivé','En séjour','Parti'].includes(String(group.status||'')));if(!wanted?.id)throw new Error(`Groupe « ${groupName} » introuvable dans les arrivées du jour.`);return fetch(`/api/operational-sync/group-360/${encodeURIComponent(wanted.id)}/arrive`,{method:'PUT',headers,body:JSON.stringify({hotelId:hotelId||undefined,userId:user.id||undefined,actorName:actor.name,actorRole:actor.role})});})
    .then(async response=>{const data=await response.json().catch(()=>({})) as ArrivalResponse;if(!response.ok)throw new Error((data as any)?.message||`Arrivée impossible (${response.status})`);const version=Number(data.version||0),payload=Array.isArray(data.payload)?data.payload:[];if(payload.length)window.dispatchEvent(new CustomEvent('hospicore:operational-draft',{detail:{namespace:'group-360',payload}}));const detail={namespace:'group-360',version,at:Date.now(),source:'remote' as const};window.dispatchEvent(new CustomEvent('hospicore:operational-change',{detail}));channel?.postMessage(detail);window.dispatchEvent(new CustomEvent('hospicore:toast',{detail:{type:'success',message:`${groupName} est maintenant présent.`}}));})
    .catch(error=>{console.error('[HospiCore] Arrivée groupe:',error);window.dispatchEvent(new CustomEvent('hospicore:toast',{detail:{type:'error',message:error instanceof Error?error.message:'Arrivée impossible'}}));})
    .finally(()=>{busy=false;button.disabled=false;});
  };
  document.addEventListener('click',onClick,true);
  return()=>{document.removeEventListener('click',onClick,true);channel?.close();};
 },[]);
 return null;
}
