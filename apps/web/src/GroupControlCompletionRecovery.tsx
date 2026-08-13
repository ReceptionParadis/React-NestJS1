import { useEffect, useMemo } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Audit={action?:string;actor?:string;at?:string};
type Control={validatedAt?:string;printedAt?:string;locked?:boolean};
type Group={id:string;name?:string;status?:string;audit?:Audit[];groupControl?:Control};
type Completion={groupId:string;groupName:string;validatedAt:string;printedAt:string;locked:boolean;recoveredFromAudit:boolean};

function fold(v?:string){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function auditCompletion(g:Group):Completion|null{
 const audit=[...(g.audit||[])].reverse();
 const printed=audit.find(a=>/controle groupe imprime et verrouille/i.test(fold(a.action)));
 const validated=audit.find(a=>/controle groupe reel enregistre/i.test(fold(a.action)));
 const control=g.groupControl;
 if(control?.validatedAt||control?.printedAt||control?.locked){return{groupId:g.id,groupName:g.name||'Groupe',validatedAt:control.validatedAt||validated?.at||printed?.at||'',printedAt:control.printedAt||printed?.at||'',locked:Boolean(control.locked||control.printedAt||printed),recoveredFromAudit:false}}
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
  completions.forEach(c=>{const old=byId.get(c.groupId);if(!old){next.push(c);changed=true;return}if((c.printedAt&&!old.printedAt)||(c.validatedAt&&!old.validatedAt)||(c.locked&&!old.locked)){const i=next.findIndex(x=>x.groupId===c.groupId);next[i]={...old,...c,recoveredFromAudit:old.recoveredFromAudit&&c.recoveredFromAudit};changed=true}});
  if(changed)void ledger.save(next);
 },[completions,ledger.data]);

 useEffect(()=>{
  if(!location.pathname.startsWith('/reception/controles'))return;
  const apply=()=>{
   const completionMap=new Map<string,Completion>();
   [...ledger.data,...completions].forEach(c=>completionMap.set(fold(c.groupName),c));
   document.querySelectorAll<HTMLElement>('.reception-control-list > article').forEach(row=>{
    const name=fold(row.querySelector('strong')?.textContent);
    const completed=completionMap.get(name);
    if(!completed)return;
    const group=groups.data.find(g=>fold(g.name)===name);
    const nativeControl=Boolean(group?.groupControl?.validatedAt||group?.groupControl?.printedAt||group?.groupControl?.locked);
    if(nativeControl)return;
    const state=row.querySelector<HTMLElement>('span b');
    if(state)state.textContent=completed.locked?'Verrouillé · déjà imprimé':'Validé · déjà réalisé';
    const button=row.querySelector<HTMLButtonElement>('button');
    if(button){button.disabled=true;button.title='Contrôle déjà réalisé. Historique récupéré depuis le journal d’audit.';button.setAttribute('aria-disabled','true');const svg=button.querySelector('svg');button.textContent='';if(svg)button.appendChild(svg);button.append(document.createTextNode(' Contrôle déjà réalisé'))}
    row.dataset.controlRecovered='true';
   });
  };
  const observer=new MutationObserver(()=>requestAnimationFrame(apply));
  observer.observe(document.body,{childList:true,subtree:true});
  apply();
  return()=>observer.disconnect();
 },[groups.data,ledger.data,completions]);

 return null;
}
