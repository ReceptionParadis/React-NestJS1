import { useEffect } from 'react';
import { currentRole } from './permissions';

function session(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function token(){return session()?.token||localStorage.getItem('hospicore.token')||''}

export function NightAuditorRoleBootstrap(){
 useEffect(()=>{if(currentRole()!=='direction')return;let cancelled=false;(async()=>{try{const headers={Authorization:`Bearer ${token()}`,'Content-Type':'application/json'};const response=await fetch('/api/auth/admin/roles',{headers});if(!response.ok)return;const roles=await response.json() as Array<{label?:string}>;const exists=roles.some(r=>String(r.label||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='veilleur de nuit');if(exists||cancelled)return;const created=await fetch('/api/auth/admin/roles',{method:'POST',headers,body:JSON.stringify({label:'Veilleur de nuit',description:'Accès nuit : plaintes clients, feuille de route veilleur et consignes en lecture/accusé de lecture.',baseRole:'reception'})});if(created.ok&&!cancelled&&location.pathname.startsWith('/administration'))location.reload()}catch{}})();return()=>{cancelled=true}},[]);
 return null;
}
