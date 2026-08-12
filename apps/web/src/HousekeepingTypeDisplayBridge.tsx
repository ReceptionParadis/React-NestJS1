import { useEffect } from 'react';

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}

export function HousekeepingTypeDisplayBridge(){
  useEffect(()=>{
    const sync=()=>{
      document.querySelectorAll<HTMLElement>('.operational-group-card.expanded').forEach(card=>{
        const sections=Array.from(card.querySelectorAll<HTMLElement>('.operational-360-grid > section'));
        const tracking=sections.find(section=>normalize(section.querySelector('h4')?.textContent||'')==='suivi chambres');
        if(!tracking)return;
        const logistics=sections.find(section=>normalize(section.querySelector('h4')?.textContent||'')==='transport & logistique');
        const serviceRow=logistics?Array.from(logistics.querySelectorAll<HTMLParagraphElement>('p')).find(row=>normalize(row.querySelector('b')?.textContent||'')==='prestation chambres'):null;
        const value=serviceRow?.querySelector('span')?.textContent?.trim()||'Non renseignée';
        let row=tracking.querySelector<HTMLParagraphElement>('[data-housekeeping-type-row="true"]');
        if(!row){row=document.createElement('p');row.dataset.housekeepingTypeRow='true';const label=document.createElement('b');label.textContent='Prestation';const content=document.createElement('span');row.append(label,content);const first=tracking.querySelector('p');if(first)tracking.insertBefore(row,first);else tracking.appendChild(row)}
        const content=row.querySelector('span');if(!content)return;
        if(content.textContent!==value)content.textContent=value;
        content.className='housekeeping-service';
        if(normalize(value).includes('express'))content.classList.add('express');
        else if(normalize(value).includes('standard'))content.classList.add('standard');
      });
    };
    const schedule=()=>window.requestAnimationFrame(()=>window.requestAnimationFrame(sync));
    sync();
    document.addEventListener('click',schedule,true);
    window.addEventListener('hospicore:operational-change',schedule as EventListener);
    window.addEventListener('hospicore:operational-draft',schedule as EventListener);
    return()=>{document.removeEventListener('click',schedule,true);window.removeEventListener('hospicore:operational-change',schedule as EventListener);window.removeEventListener('hospicore:operational-draft',schedule as EventListener)};
  },[]);
  return <style>{`.housekeeping-service{font-weight:800}.housekeeping-service.express{color:#9a5a00}.housekeeping-service.standard{color:#287143}`}</style>;
}
