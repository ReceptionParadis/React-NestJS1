import { useEffect } from 'react';

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function departmentFor(profile:string){
 const value=normalize(profile);
 if(value.includes('admin')||value.includes('direction')||value.includes('directeur'))return'Direction & Administration';
 if(value.includes('reception')||value.includes('veilleur')||value.includes('nuit'))return'Réception';
 if(value.includes('commercial'))return'Commercial';
 if(value.includes('maintenance')||value.includes('technicien')||value.includes('technique'))return'Maintenance';
 return'Autres profils';
}

export function AdministrationRoleProfileBridge(){
 useEffect(()=>{
  if(!location.pathname.startsWith('/administration'))return;
  let arranging=false;
  const style=document.createElement('style');
  style.dataset.hospicoreAdminDirectory='true';
  style.textContent=`
   .admin-directory-tools{display:flex;align-items:center;gap:12px;margin:0 0 16px;padding:14px 16px;border:1px solid #e7ddd4;border-radius:14px;background:#fbf8f5}
   .admin-directory-search{width:min(440px,100%);height:42px;padding:0 14px;border:1px solid #d9cbc1;border-radius:11px;background:#fff;color:#2d2426;font:inherit;outline:none}
   .admin-directory-search:focus{border-color:#7d1d36;box-shadow:0 0 0 3px rgba(125,29,54,.08)}
   .admin-directory-count{margin-left:auto;color:#806d71;font-size:12px;font-weight:700;white-space:nowrap}
   .admin-department{margin:10px 0;border:1px solid #e7ddd4;border-radius:14px;background:#fff;overflow:hidden}
   .admin-department>summary{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 15px;background:#f8f4f1;color:#5f1b2d;cursor:pointer;font-weight:850;list-style:none}
   .admin-department>summary::-webkit-details-marker{display:none}.admin-department>summary:before{content:'›';font-size:22px;line-height:1;transition:transform .15s ease}.admin-department[open]>summary:before{transform:rotate(90deg)}
   .admin-department>summary span{margin-left:auto;display:grid;place-items:center;min-width:28px;height:28px;padding:0 8px;border-radius:999px;background:#efe3e6;font-size:12px}
   .admin-department .admin-row{border-top:1px solid #eee6df}.admin-department .admin-row:first-of-type{border-top:0}
   .admin-users-table.admin-directory-ready>.admin-row.head{margin-bottom:8px}.admin-directory-empty{padding:22px;text-align:center;color:#8a7378}
   @media(max-width:760px){.admin-directory-tools{align-items:stretch;flex-direction:column}.admin-directory-count{margin-left:0}.admin-directory-search{width:100%}}
  `;
  document.head.appendChild(style);

  const syncBaseRoles=()=>{
   document.querySelectorAll<HTMLSelectElement>('select[name="baseRole"]').forEach(select=>{
    if(!Array.from(select.options).some(option=>option.value==='night_auditor')){
     const option=document.createElement('option');option.value='night_auditor';option.textContent='Veilleur de nuit — Centre de Commandement, plaintes, feuille de route, consignes et tâches';
     const commercial=Array.from(select.options).find(option=>option.value==='commercial');if(commercial)select.insertBefore(option,commercial);else select.appendChild(option);
    }
   });
  };

  const arrangeDirectory=()=>{
   if(arranging)return;arranging=true;
   try{
    syncBaseRoles();
    const table=document.querySelector<HTMLElement>('.admin-users-table');
    if(!table)return;
    const directRows=Array.from(table.children).filter((node):node is HTMLElement=>node instanceof HTMLElement&&node.classList.contains('admin-row')&&!node.classList.contains('head'));
    const nestedRows=Array.from(table.querySelectorAll<HTMLElement>('.admin-department .admin-row'));
    const rows=[...directRows,...nestedRows];
    if(!rows.length)return;
    let tools=table.previousElementSibling as HTMLElement|null;
    if(!tools?.classList.contains('admin-directory-tools')){
     tools=document.createElement('div');tools.className='admin-directory-tools';
     const input=document.createElement('input');input.className='admin-directory-search';input.type='search';input.placeholder='Rechercher un utilisateur par nom…';input.setAttribute('aria-label','Rechercher un utilisateur par nom');
     const count=document.createElement('span');count.className='admin-directory-count';tools.append(input,count);table.parentElement?.insertBefore(tools,table);
     input.addEventListener('input',()=>filterDirectory(table!,input.value));
    }
    table.querySelectorAll('.admin-department').forEach(node=>node.remove());
    const groups=new Map<string,HTMLElement[]>();
    rows.forEach(row=>{
     row.style.display='';
     const select=row.querySelector<HTMLSelectElement>('select');
     const profile=select?.selectedOptions?.[0]?.textContent||select?.value||'';
     const department=departmentFor(profile);
     const list=groups.get(department)||[];list.push(row);groups.set(department,list);
    });
    const order=['Réception','Commercial','Maintenance','Direction & Administration','Autres profils'];
    order.forEach(department=>{
     const members=groups.get(department);if(!members?.length)return;
     members.sort((a,b)=>(a.querySelector('strong')?.textContent||'').localeCompare(b.querySelector('strong')?.textContent||'','fr',{sensitivity:'base'}));
     const details=document.createElement('details');details.className='admin-department';details.dataset.department=department;details.open=department==='Réception';
     const summary=document.createElement('summary');summary.append(document.createTextNode(department));const badge=document.createElement('span');badge.textContent=String(members.length);summary.appendChild(badge);details.appendChild(summary);members.forEach(row=>details.appendChild(row));table.appendChild(details);
    });
    table.classList.add('admin-directory-ready');
    const input=tools.querySelector<HTMLInputElement>('.admin-directory-search');if(input)filterDirectory(table,input.value);
   }finally{arranging=false}
  };
  const filterDirectory=(table:HTMLElement,query:string)=>{
   const q=normalize(query);let visible=0;
   table.querySelectorAll<HTMLDetailsElement>('.admin-department').forEach(group=>{
    let groupVisible=0;
    group.querySelectorAll<HTMLElement>('.admin-row').forEach(row=>{
     const name=normalize(row.querySelector('strong')?.textContent||'');const email=normalize(row.querySelector('small')?.textContent||'');const match=!q||name.includes(q)||email.includes(q);row.style.display=match?'':'none';if(match){groupVisible++;visible++}
    });
    group.style.display=groupVisible?'':'none';if(q&&groupVisible)group.open=true;
    const badge=group.querySelector('summary span');if(badge)badge.textContent=String(groupVisible);
   });
   const count=table.previousElementSibling?.querySelector<HTMLElement>('.admin-directory-count');if(count)count.textContent=`${visible} utilisateur${visible>1?'s':''}`;
  };
  arrangeDirectory();
  const observer=new MutationObserver(()=>{if(!arranging)queueMicrotask(arrangeDirectory)});observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();style.remove();document.querySelector('.admin-directory-tools')?.remove()}
 },[]);
 return null;
}
