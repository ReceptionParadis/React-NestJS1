import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, UserRound } from 'lucide-react';

type Account={id:string;firstName:string;lastName:string;role?:string;roleLabel?:string;baseRole?:string;status?:string};

type Target={label:HTMLLabelElement;input:HTMLInputElement;kind:'detail'|'create'};

function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function token(){return session()?.token||localStorage.getItem('hospicore.token')||''}
function norm(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function isTechnician(user:Account){const text=norm(`${user.baseRole||''} ${user.role||''} ${user.roleLabel||''}`);return user.status!=='INACTIVE'&&(user.baseRole==='maintenance'||text.includes('technicien')||text.includes('maintenance')||text.includes('technique'))}
function normalizeDirectory(body:unknown):Account[]{const raw=Array.isArray(body)?body:(body&&typeof body==='object'&&'users' in body&&Array.isArray((body as {users?:unknown[]}).users)?(body as {users:Account[]}).users:[]);return(raw as Account[]).filter(u=>u&&u.id&&isTechnician(u)).sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`,'fr'))}
async function loadTechnicians(){const auth=token();if(!auth)throw new Error('Session indisponible.');const response=await fetch('/api/auth/directory',{cache:'no-store',headers:{Authorization:`Bearer ${auth}`}});const body=await response.json().catch(()=>[]);if(!response.ok)throw new Error(String((body as {message?:string}).message||`Erreur HTTP ${response.status}`));return normalizeDirectory(body)}
function setNativeValue(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}
function findTargets():Target[]{return Array.from(document.querySelectorAll<HTMLLabelElement>('.maintenance-page label.field-label')).flatMap(label=>{const text=(label.childNodes[0]?.textContent||label.textContent||'').trim();if(!/^Technicien \/ responsable/i.test(text)&&!/^Responsable/i.test(text))return[];const input=label.querySelector<HTMLInputElement>('input');if(!input)return[];return[{label,input,kind:input.name==='assignee'?'create':'detail'} as Target]})}

function TechnicianSelect({target,technicians,error,onRetry}:{target:Target;technicians:Account[];error:string;onRetry:()=>void}){
 const current=target.input.value;
 const selected=technicians.find(u=>`${u.firstName} ${u.lastName}`.trim()===current)?.id||'';
 return <div className="maintenance-tech-selector"><div className="maintenance-tech-label"><UserRound size={15}/><span>Technicien Maintenance</span></div><select value={selected} onChange={e=>{const user=technicians.find(u=>u.id===e.target.value);setNativeValue(target.input,user?`${user.firstName} ${user.lastName}`.trim():'')}}><option value="">{technicians.length?'Non assigné':'Aucun technicien actif'}</option>{technicians.map(u=><option value={u.id} key={u.id}>{u.firstName} {u.lastName}{u.roleLabel?` · ${u.roleLabel}`:''}</option>)}</select>{error&&<small>{error} <button type="button" onClick={onRetry}><RefreshCw size={12}/>Réessayer</button></small>}</div>
}

export function MaintenanceExperienceBridge(){
 const[technicians,setTechnicians]=useState<Account[]>([]),[error,setError]=useState(''),[targets,setTargets]=useState<Target[]>([]);
 async function refresh(){setError('');try{setTechnicians(await loadTechnicians())}catch(e){setTechnicians([]);setError(e instanceof Error?e.message:'Impossible de charger les techniciens.')}}
 useEffect(()=>{if(!location.pathname.startsWith('/tickets'))return;void refresh();const sync=()=>{document.querySelectorAll<HTMLElement>('.maintenance-photos').forEach(el=>el.style.display='none');document.querySelectorAll<HTMLLabelElement>('.maintenance-page label.field-label').forEach(label=>{const text=(label.textContent||'').trim();if(/^Photo avant/i.test(text)||/^Photo après/i.test(text))label.style.display='none'});const next=findTargets();next.forEach(t=>{t.input.style.display='none';t.label.classList.add('maintenance-assignee-host')});setTargets(prev=>{const key=(list:Target[])=>list.map(x=>`${x.kind}:${x.input.name}:${x.input.value}:${x.label.textContent}`).join('|');return key(prev)===key(next)?prev:next})};sync();const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[]);
 if(!location.pathname.startsWith('/tickets'))return null;
 return <>{targets.map((target,index)=>createPortal(<TechnicianSelect target={target} technicians={technicians} error={error} onRetry={()=>void refresh()}/>,target.label,`maintenance-tech-${target.kind}-${index}`))}</>;
}
