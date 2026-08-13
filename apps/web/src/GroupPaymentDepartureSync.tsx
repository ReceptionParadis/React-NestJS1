import { useEffect, useRef } from 'react';
import { useOperationalStore } from './useOperationalStore';

type DepartureChecklist={settlementStatus?:'pending'|'paid'|'debtor';paymentMethod?:string;debtorName?:string;settlementAt?:string;settlementBy?:string;keysRecovered?:boolean;keysRecoveredAt?:string;keysRecoveredBy?:string;[key:string]:unknown};
type Group={id:string;paymentStatus?:string;debtor?:string;departureChecklist?:DepartureChecklist;[key:string]:unknown};

function fold(value:unknown){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}

export function GroupPaymentDepartureSync(){
 const store=useOperationalStore<Group[]>('group-360',[]);
 const saving=useRef(false);
 useEffect(()=>{
  if(saving.current||!store.data.length)return;
  let changed=false;
  const next=store.data.map(group=>{
   const payment=fold(group.paymentStatus);
   const current={settlementStatus:'pending' as const,paymentMethod:'',debtorName:'',...(group.departureChecklist||{})};
   let paymentStatus=group.paymentStatus||'Reste à payer';
   let checklist:DepartureChecklist=current;

   if(payment==='paye'){
    if(current.settlementStatus!=='paid'||!String(current.paymentMethod||'').trim()){
     checklist={...current,settlementStatus:'paid',paymentMethod:String(current.paymentMethod||'').trim()||'Payé'};
     changed=true;
    }
   }else if(payment==='debiteur'){
    const debtor=String(group.debtor||current.debtorName||'Débiteur').trim()||'Débiteur';
    if(current.settlementStatus!=='debtor'||current.debtorName!==debtor){
     checklist={...current,settlementStatus:'debtor',debtorName:debtor};
     changed=true;
    }
   }else if(payment==='reste a payer'){
    // Si la Réception a déjà soldé ou passé le compte en débiteur,
    // on remonte cette information dans la fiche Groupe 360° au lieu de la perdre.
    if(current.settlementStatus==='paid'){
     paymentStatus='Payé';changed=true;
    }else if(current.settlementStatus==='debtor'){
     paymentStatus='Débiteur';changed=true;
    }
   }
   if(paymentStatus===group.paymentStatus&&checklist===current)return group;
   return{...group,paymentStatus,departureChecklist:checklist};
  });
  if(!changed)return;
  saving.current=true;
  void store.saveImmediate(next).finally(()=>{saving.current=false});
 },[store.data]);
 return null;
}
