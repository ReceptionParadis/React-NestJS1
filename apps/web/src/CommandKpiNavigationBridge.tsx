import { useEffect } from 'react';

const DESTINATIONS: Record<string,string> = {
  'groupes presents':'/reception/arrivees-departs',
  'arrivees':'/reception/arrivees-departs',
  'departs':'/reception/arrivees-departs',
  'controles':'/reception/controles',
  'maintenance ouverte':'/tickets',
};

function normalize(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}

export function CommandKpiNavigationBridge(){
  useEffect(()=>{
    if(location.pathname!=='/' && location.pathname!=='') return;
    let disposed=false;
    const decorate=()=>{
      if(disposed) return;
      const cards=Array.from(document.querySelectorAll<HTMLElement>('.command-kpis > article'));
      cards.forEach(card=>{
        const label=normalize(card.querySelector('span')?.textContent||'');
        const href=DESTINATIONS[label];
        if(!href) return;
        card.dataset.kpiHref=href;
        card.setAttribute('role','link');
        card.setAttribute('tabindex','0');
        card.setAttribute('aria-label',`${card.querySelector('span')?.textContent||'Ouvrir'} — ouvrir le menu`);
        card.title='Ouvrir le menu';
      });
    };
    const onClick=(event:MouseEvent)=>{
      const target=(event.target as Element|null)?.closest<HTMLElement>('.command-kpis > article[data-kpi-href]');
      if(!target) return;
      location.href=target.dataset.kpiHref||'/';
    };
    const onKey=(event:KeyboardEvent)=>{
      if(event.key!=='Enter'&&event.key!==' ') return;
      const target=(event.target as Element|null)?.closest<HTMLElement>('.command-kpis > article[data-kpi-href]');
      if(!target) return;
      event.preventDefault();
      location.href=target.dataset.kpiHref||'/';
    };
    const observer=new MutationObserver(()=>decorate());
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',onClick);
    document.addEventListener('keydown',onKey);
    decorate();
    return()=>{disposed=true;observer.disconnect();document.removeEventListener('click',onClick);document.removeEventListener('keydown',onKey)};
  },[]);
  return <style>{`
    .command-kpis>article[data-kpi-href]{cursor:pointer;position:relative;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease}
    .command-kpis>article[data-kpi-href]:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(80,35,47,.10);border-color:#cdb6bc;background:#fffdfb}
    .command-kpis>article[data-kpi-href]:focus-visible{outline:3px solid rgba(123,25,49,.18);outline-offset:2px;border-color:#8b2340}
    .command-kpis>article[data-kpi-href]::after{content:'Ouvrir →';position:absolute;right:16px;bottom:14px;font-size:11px;font-weight:800;color:#8b2340;opacity:0;transform:translateX(-4px);transition:.16s ease}
    .command-kpis>article[data-kpi-href]:hover::after,.command-kpis>article[data-kpi-href]:focus-visible::after{opacity:1;transform:translateX(0)}
  `}</style>;
}
