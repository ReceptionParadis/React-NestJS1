import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LockOpen } from 'lucide-react';
import { can, currentRole } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type CashDepartment='reception'|'restaurant'|'bar';
type CashDay={
 id:string;date:string;department:CashDepartment;lockedAt?:string;lockedBy?:string;
 directionValidatedAt?:string;directionValidatedBy?:string;validations?:Record<string,unknown>;
 [key:string]:unknown;
};

function actor(){try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}'),u=s.user||{};return`${u.firstName||'Direction'} ${u.lastName||''}`.trim()}catch{return'Direction'}}
function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function department(value:string|null):CashDepartment{return value==='restaurant'||value==='bar'?value:'reception'}
function label(value:CashDepartment){return value==='restaurant'?'Restaurant':value==='bar'?'Bar':'Réception'}
function dateLabel(value:string){const d=new Date(`${value}T12:00:00`);return Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR'):value}

export function DirectionCashUnlockBridge(){
 const store=useOperationalStore<CashDay[]>('reception-cash-day',[]),[mount,setMount]=useState<HTMLElement|null>(null),role=currentRole(),allowed=role==='direction'&&can('cash.edit',role);
 const params=new URLSearchParams(location.search),dept=department(params.get('department')),date=params.get('date')||todayIso();
 const current=useMemo(()=>Array.isArray(store.data)?store.data.find(c=>c.department===dept&&c.date===date):undefined,[store.data,dept,date]);
 useEffect(()=>{
  if(!allowed||!location.pathname.startsWith('/reception/caisse')){setMount(null);return;}
  let stopped=false;
  const attach=()=>{if(stopped)return;const toolbar=document.querySelector<HTMLElement>('.cash-toolbar');if(!toolbar){window.setTimeout(attach,150);return;}let node=toolbar.querySelector<HTMLElement>('.direction-cash-unlock-mount');if(!node){node=document.createElement('span');node.className='direction-cash-unlock-mount';toolbar.appendChild(node)}setMount(node)};
  attach();return()=>{stopped=true;document.querySelectorAll('.direction-cash-unlock-mount').forEach(n=>n.remove())};
 },[allowed]);
 async function unlock(){
  if(!current?.lockedAt||!allowed)return;
  const confirmed=window.confirm(`Déverrouiller la caisse ${label(current.department)} du ${dateLabel(current.date)} ?\n\nToute validation Direction existante sera annulée et devra être refaite après les modifications.`);if(!confirmed)return;
  const next=store.data.map(c=>c.id===current.id?{...c,lockedAt:undefined,lockedBy:undefined,directionValidatedAt:undefined,directionValidatedBy:undefined,validations:{},updatedAt:new Date().toISOString(),directionUnlockBy:actor(),directionUnlockAt:new Date().toISOString()}:c);
  if(await store.save(next))window.location.reload();
 }
 if(!mount||!allowed||!current?.lockedAt)return null;
 return createPortal(<button type="button" onClick={()=>void unlock()} title="Réservé à la Direction" style={{display:'inline-flex',alignItems:'center',gap:7,padding:'10px 14px',border:'1px solid #b98b96',borderRadius:10,background:'#fff7f8',color:'#7b1931',fontWeight:800,cursor:'pointer'}}><LockOpen size={16}/>Déverrouiller la caisse</button>,mount);
}
