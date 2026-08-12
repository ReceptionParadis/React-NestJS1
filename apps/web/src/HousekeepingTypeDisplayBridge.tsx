import { useEffect } from 'react';

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}

export function HousekeepingTypeDisplayBridge(){
  useEffect(()=>{
    const sync=()=>{
      document.querySelectorAll<HTMLElement>('.operational-group-card.expanded').forEach(card=>{
        const sections=Array.from(card.querySelectorAll<HTMLElement>('.operational-360-grid > section'));
        const tracking=sections.find(section=>normalize(section.querySelector('h4')?.textContent||'')==='suivi chambres');
        if(!tracking)return;
        if(tracking.querySelector('[data-housekeeping-type-row="true"]'))return;
        const logistics=sections.find(section=>normalize(section.querySelector('h4')?.textContent||'')==='transport & logistique');
        const serviceRow=logistics?Array.from(logistics.querySelectorAll<HTMLParagraphElement>('p')).find(row=>normalize(row.querySelector('b')?.textContent||'')==='prestation chambres'):null;
        const value=serviceRow?.querySelector('span')?.textContent?.trim()||'Non renseignée';
        const row=document.createElement('p');
        row.dataset.housekeepingTypeRow='true';
        const label=document.createElement('b');label.textContent='Prestation';
        const content=document.createElement('span');content.textContent=value;
        if(normalize(value).includes('express'))content.className='housekeeping-service express';
        else if(normalize(value).includes('standard'))content.className='housekeeping-service standard';
        row.append(label,content);
        const first=tracking.querySelector('p');
        if(first)tracking.insertBefore(row,first);else tracking.appendChild(row);
      });
    };
    sync();
    const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return <style>{`.housekeeping-service{font-weight:800}.housekeeping-service.express{color:#9a5a00}.housekeeping-service.standard{color:#287143}`}</style>;
}
