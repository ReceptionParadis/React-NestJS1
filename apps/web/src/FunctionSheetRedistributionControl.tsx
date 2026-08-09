import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type WeeklySheet={id:string;weekStart:string;status:string;lastDistributedAt?:string;lastDistributedBy?:string;distributionCount?:number;[key:string]:unknown};
function sessionName(){try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}'),u=s.user||{};return`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim()}catch{return'Utilisateur HospiCore'}}
function currentWeekStart(){const params=new URLSearchParams(location.search),value=params.get('weekStart');if(value)return value;const d=new Date(),day=d.getDay()||7;d.setDate(d.getDate()-day+1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

export function FunctionSheetRedistributionControl(){
 const store=useOperationalStore<WeeklySheet[]>('function-sheets',[]),[mount,setMount]=useState<HTMLElement|null>(null);
 const sheet=useMemo(()=>store.data.find(item=>item.weekStart===currentWeekStart())||store.data.find(item=>item.status==='Diffusée'),[store.data]);
 useEffect(()=>{if(!location.pathname.startsWith('/reception/fiche-fonction')){setMount(null);return;}const attach=()=>{const footer=document.querySelector<HTMLElement>('.function-sheet-footer');if(!footer){setMount(null);return;}let node=footer.querySelector<HTMLElement>('.redistribution-control-mount');if(!node){node=document.createElement('div');node.className='redistribution-control-mount';footer.appendChild(node)}setMount(node)};attach();const observer=new MutationObserver(attach);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();document.querySelectorAll('.redistribution-control-mount').forEach(node=>node.remove())}},[]);
 async function redistribute(){if(!sheet)return;const now=new Date().toISOString(),by=sessionName();await store.save(store.data.map(item=>item.id===sheet.id?{...item,status:'Diffusée',lastDistributedAt:now,lastDistributedBy:by,distributionCount:Number(item.distributionCount||0)+1}:item));}
 if(!mount||!sheet||!['Prête à imprimer','Diffusée'].includes(sheet.status))return null;
 return createPortal(<button type="button" className="redistribution-button" onClick={()=>void redistribute()}><Send size={16}/>{sheet.status==='Diffusée'?'Confirmer une rediffusion':'Confirmer la diffusion'}</button>,mount);
}
