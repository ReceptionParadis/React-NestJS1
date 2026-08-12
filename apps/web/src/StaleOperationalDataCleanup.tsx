import { useEffect, useRef } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Group={id:string;name?:string;pax?:number;arrival?:string};

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}

export function StaleOperationalDataCleanup(){
 const groups=useOperationalStore<Group[]>('group-360',[]),running=useRef(false);
 useEffect(()=>{
  if(running.current||groups.state==='loading'||groups.state==='saving')return;
  const stale=groups.data.filter(group=>normalize(group.name||'')==='evenman karayib'&&Number(group.pax||0)===64&&group.arrival==='2026-08-12');
  if(!stale.length)return;
  running.current=true;
  const staleIds=new Set(stale.map(group=>group.id));
  void groups.saveImmediate(groups.data.filter(group=>!staleIds.has(group.id))).finally(()=>{running.current=false});
 },[groups.data,groups.state]);
 return null;
}
