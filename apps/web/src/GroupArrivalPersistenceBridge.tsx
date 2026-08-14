import { useEffect } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Audit={id:string;action:string;actor:string;role:string;at:string};
type Group={id:string;name?:string;arrival?:string;status?:string;arrivalConfirmedAt?:string;arrivalConfirmedBy?:string;audit?:Audit[];[key:string]:unknown};

function todayIso(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function actor(){try{const session=JSON.parse(localStorage.getItem('hospicore.session')||'{}'),user=session.user||{};return{name:`${user.firstName||'Utilisateur'} ${user.lastName||'HospiCore'}`.trim(),role:String(user.role?.name||user.role||'Réception')}}catch{return{name:'Utilisateur HospiCore',role:'Réception'}}}
function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}

export function GroupArrivalPersistenceBridge(){
 const store=useOperationalStore<Group[]>('group-360',[]);
 useEffect(()=>{
  if(!location.pathname.startsWith('/reception/arrivees-departs'))return;
  let busy=false;
  const onClick=(event:MouseEvent)=>{
   const button=(event.target as HTMLElement|null)?.closest('button');
   if(!button||normalize(button.textContent||'')!=='mettre en arrivee')return;
   if(busy)return;
   const card=button.closest<HTMLElement>('.reception-op-card');
   const name=card?.querySelector<HTMLElement>('.reception-op-identity strong')?.textContent?.trim()||'';
   if(!name)return;
   const group=store.data.find(item=>String(item.name||'').trim()===name&&item.arrival===todayIso()&&!['Arrivé','En séjour','Parti'].includes(String(item.status||'')));
   if(!group)return;
   event.preventDefault();event.stopPropagation();
   busy=true;
   const user=actor(),at=new Date().toLocaleString('fr-FR'),audit:Audit={id:crypto.randomUUID(),action:`Arrivée confirmée par ${user.name} · ${at}`,actor:user.name,role:user.role,at};
   const next=store.data.map(item=>item.id===group.id?{...item,status:'Arrivé',arrivalConfirmedAt:at,arrivalConfirmedBy:user.name,audit:[...(item.audit||[]),audit]}:item);
   store.setData(next);
   void store.saveImmediate(next).then(ok=>{if(!ok)return store.refresh(true)}).finally(()=>{busy=false});
  };
  document.addEventListener('click',onClick,true);
  return()=>document.removeEventListener('click',onClick,true);
 },[store.data,store.saveImmediate,store.refresh,store.setData]);
 return null;
}
