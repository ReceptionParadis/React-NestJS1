import { useEffect } from 'react';

type SessionUser={id?:string;hotelId?:string;hotel?:{id?:string};firstName?:string;lastName?:string;role?:{name?:string}|string};
type Session={token?:string;accessToken?:string;user?:SessionUser};

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function session():Session{try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function tokenOf(current:Session){return current.token||current.accessToken||localStorage.getItem('hospicore.token')||localStorage.getItem('hospicore.accessToken')||''}
function actorOf(current:Session){const user=current.user||{},role=typeof user.role==='string'?user.role:user.role?.name||'Réception';return{name:`${user.firstName||'Utilisateur'} ${user.lastName||'HospiCore'}`.trim(),role}}

export function GroupArrivalPersistenceBridge(){
 useEffect(()=>{
  if(!location.pathname.startsWith('/reception/arrivees-departs'))return;
  let busy=false;
  const onClick=(event:MouseEvent)=>{
   const button=(event.target as HTMLElement|null)?.closest<HTMLButtonElement>('button');
   if(!button||normalize(button.textContent||'')!=='mettre en arrivee'||busy)return;
   const card=button.closest<HTMLElement>('.reception-op-card');
   const groupId=card?.getAttribute('data-group-id')||'';
   if(!groupId)return;
   event.preventDefault();event.stopPropagation();
   busy=true;button.disabled=true;
   const current=session(),user=current.user||{},actor=actorOf(current),token=tokenOf(current),hotelId=user.hotelId||user.hotel?.id||'';
   void fetch(`/api/operational-sync/group-360/${encodeURIComponent(groupId)}/arrive`,{
    method:'PUT',
    headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
    body:JSON.stringify({hotelId:hotelId||undefined,userId:user.id||undefined,actorName:actor.name,actorRole:actor.role}),
   }).then(async response=>{
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.message||`Arrivée impossible (${response.status})`);
    const version=Number(data?.version||0);
    window.dispatchEvent(new CustomEvent('hospicore:operational-change',{detail:{namespace:'group-360',version,at:Date.now(),source:'remote'}}));
   }).catch(error=>{
    console.error('[HospiCore] Arrivée groupe:',error);
    window.dispatchEvent(new CustomEvent('hospicore:toast',{detail:{type:'error',message:error instanceof Error?error.message:'Arrivée impossible'}}));
   }).finally(()=>{busy=false;button.disabled=false;});
  };
  document.addEventListener('click',onClick,true);
  return()=>document.removeEventListener('click',onClick,true);
 },[]);
 return null;
}
