import { useEffect, useMemo } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Audit={action?:string;actor?:string;at?:string};
type Control={validatedAt?:string;printedAt?:string;locked?:boolean;[key:string]:unknown};
type Group={id:string;name?:string;status?:string;audit?:Audit[];groupControl?:Control};
type Completion={groupId:string;groupName:string;validatedAt:string;printedAt:string;locked:boolean;recoveredFromAudit:boolean};

function fold(v?:string){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function auditCompletion(g:Group):Completion|null{
 const audit=[...(g.audit||[])].reverse();
 const printed=audit.find(a=>/controle groupe imprime et verrouille/i.test(fold(a.action)));
 const validated=audit.find(a=>/controle groupe reel enregistre/i.test(fold(a.action)));
 const control=g.groupControl;
 if(control?.validatedAt||control?.printedAt||control?.locked){return{groupId:g.id,groupName:g.name||'Groupe',validatedAt:String(control.validatedAt||validated?.at||printed?.at||''),printedAt:String(control.printedAt||printed?.at||''),locked:Boolean(control.locked||control.printedAt||printed),recoveredFromAudit:false}}
 if(!printed&&!validated)return null;
 return{groupId:g.id,groupName:g.name||'Groupe',validatedAt:validated?.at||printed?.at||'',printedAt:printed?.at||'',locked:Boolean(printed),recoveredFromAudit:true};
}

export function GroupControlCompletionRecovery(){
 const groups=useOperationalStore<Group[]>('group-360',[]);
 const ledger=useOperationalStore<Completion[]>('group-control-completions',[]);
 const completions=useMemo(()=>groups.data.map(auditCompletion).filter(Boolean) as Completion[],[groups.data]);

 useEffect(()=>{
  if(!completions.length)return;
  const byId=new Map(ledger.data.map(x=>[x.groupId,x]));
  let changed=false;
  const next=[...ledger.data];
  completions.forEach(c=>{
   const old=byId.get(c.groupId);
   if(!old){next.push(c);changed=true;return}
   if((c.printedAt&&!old.printedAt)||(c.validatedAt&&!old.validatedAt)||(c.locked&&!old.locked)){
    const i=next.findIndex(x=>x.groupId===c.groupId);
    next[i]={...old,...c,recoveredFromAudit:old.recoveredFromAudit&&c.recoveredFromAudit};
    changed=true;
   }
  });
  if(changed)void ledger.save(next);
 },[completions,ledger.data]);

 // Les anciennes versions d'HospiCore enregistraient parfois la réalisation du
 // contrôle uniquement dans le journal d'audit / registre de complétion. On
 // réinjecte ici uniquement les marqueurs de validation et d'impression dans
 // groupControl, sans toucher au contenu métier déjà enregistré. La page React
 // native peut ainsi garder le contrôle consultable et réimprimable au lieu de
 // remplacer son bouton par un état désactivé « Contrôle déjà réalisé ».
 useEffect(()=>{
  if(!groups.data.length)return;
  const completionMap=new Map<string,Completion>();
  [...ledger.data,...completions].forEach(c=>completionMap.set(c.groupId,c));
  let changed=false;
  const next=groups.data.map(g=>{
   const completed=completionMap.get(g.id);
   if(!completed)return g;
   const current=g.groupControl||{};
   if(current.validatedAt||current.printedAt||current.locked)return g;
   changed=true;
   return{
    ...g,
    groupControl:{
     ...current,
     validatedAt:completed.validatedAt,
     ...(completed.printedAt?{printedAt:completed.printedAt}:{}),
     locked:completed.locked,
    },
   };
  });
  if(changed)void groups.save(next);
 },[groups.data,ledger.data,completions]);

 return null;
}
