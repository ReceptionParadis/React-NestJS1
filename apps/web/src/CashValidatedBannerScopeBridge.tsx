import { useEffect } from 'react';
import { useOperationalStore } from './useOperationalStore';

type CashDepartment='reception'|'restaurant'|'bar';
type CashDay={id:string;date:string;department:CashDepartment;directionValidatedAt?:string;directionValidatedBy?:string};

function iso(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function yesterday(){const d=new Date();d.setDate(d.getDate()-1);return iso(d)}
function selection(){const params=new URLSearchParams(location.search);const department=(params.get('department')||'reception') as CashDepartment;const date=params.get('date')||(department==='bar'?yesterday():iso());return{department,date}}
function isLegacyBanner(node:Element){const text=(node.textContent||'').trim().toLowerCase();return text.startsWith('caisse validée')||text.startsWith('caisse validee')}

export function CashValidatedBannerScopeBridge(){
 const store=useOperationalStore<CashDay[]>('reception-cash-day',[]);
 useEffect(()=>{
  if(!location.pathname.startsWith('/reception/caisse'))return;
  let stopped=false,last='';
  const sync=()=>{
   if(stopped)return;
   const sheet=document.querySelector<HTMLElement>('.cash-sheet');
   if(!sheet){window.setTimeout(sync,120);return}
   const {department,date}=selection();
   const current=(Array.isArray(store.data)?store.data:[]).find(c=>c.department===department&&c.date===date);
   const key=`${department}|${date}|${current?.directionValidatedAt||''}`;
   const children=Array.from(sheet.children);
   children.filter(isLegacyBanner).forEach(node=>{
    const el=node as HTMLElement;
    if(current?.directionValidatedAt){
     el.style.display='';
     // Le bandeau historique peut contenir les données d'une autre caisse après replaceState.
     const departmentLabel=department==='restaurant'?'Restaurant':department==='bar'?'Bar':'Réception';
     const formatted=new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR');
     const primary=el.querySelector('span');if(primary)primary.textContent=`Caisse validée · ${departmentLabel} · ${formatted}`;
     const detail=el.querySelector('small');if(detail)detail.textContent=`par ${current.directionValidatedBy||'Direction'} · ${new Date(current.directionValidatedAt).toLocaleString('fr-FR')}`;
    }else el.style.display='none';
   });
   last=key;
  };
  sync();
  const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});
  const timer=window.setInterval(()=>{const {department,date}=selection();const current=(Array.isArray(store.data)?store.data:[]).find(c=>c.department===department&&c.date===date);const key=`${department}|${date}|${current?.directionValidatedAt||''}`;if(key!==last)sync()},180);
  return()=>{stopped=true;observer.disconnect();window.clearInterval(timer)};
 },[store.data,store.version]);
 return null;
}
