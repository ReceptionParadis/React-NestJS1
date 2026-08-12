import { useEffect, useRef } from 'react';
import { useOperationalStore } from './useOperationalStore';

type Complaint={id:string;client:string;room:string;category:string;description:string;status:'Ouverte'|'Traitée';createdAt:string;createdBy:string;resolvedAt?:string;resolvedBy?:string};

function localDateKey(value?:string){const d=value?new Date(value):new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function escapeHtml(value?:string){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]||char))}
function shortTime(value?:string){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
function longDate(key:string){return new Date(`${key}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
function parseFrenchDate(text:string){
 const months:Record<string,number>={janvier:1,fevrier:2,février:2,mars:3,avril:4,mai:5,juin:6,juillet:7,aout:8,août:8,septembre:9,octobre:10,novembre:11,decembre:12,décembre:12};
 const normalized=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const match=normalized.match(/(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/);
 if(!match)return'';const month=months[match[2]]||0;if(!month)return'';return`${match[3]}-${String(month).padStart(2,'0')}-${String(Number(match[1])).padStart(2,'0')}`;
}
function reportHtml(items:Complaint[],date:string){
 const opened=items.filter(item=>item.status==='Ouverte').length,closed=items.filter(item=>item.status==='Traitée').length;
 const rows=items.map((item,index)=>`<article class="complaint-card">
   <div class="card-index">${String(index+1).padStart(2,'0')}</div>
   <div class="card-main">
    <header><div><strong>${escapeHtml(item.client||'Client non renseigné')}</strong><span>${item.room?`Chambre ${escapeHtml(item.room)} · `:''}${escapeHtml(item.category)}</span></div><b class="status ${item.status==='Traitée'?'closed':'open'}">${escapeHtml(item.status)}</b></header>
    <p>${escapeHtml(item.description||'Aucune description')}</p>
    <div class="meta"><span><b>Signalée</b>${shortTime(item.createdAt)} · ${escapeHtml(item.createdBy||'—')}</span>${item.status==='Traitée'?`<span><b>Traitée</b>${shortTime(item.resolvedAt)} · ${escapeHtml(item.resolvedBy||'—')}</span>`:''}</div>
   </div>
  </article>`).join('');
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport plaintes - ${escapeHtml(date)}</title><style>
 @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#2b2023;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-size:10pt}.sheet{width:100%;max-width:186mm;margin:0 auto}.top{display:grid;grid-template-columns:1fr auto;gap:10mm;align-items:start;padding-bottom:6mm;border-bottom:2px solid #761b32}.eyebrow{margin:0 0 2mm;color:#9a7748;font-size:7pt;font-weight:900;letter-spacing:.14em}.top h1{margin:0;color:#761b32;font-size:20pt;line-height:1.05}.date{margin:2mm 0 0;text-transform:capitalize;font-size:10pt;font-weight:700}.total{min-width:30mm;padding:4mm 5mm;border-radius:4mm;background:#f3ebe6;text-align:center}.total strong{display:block;color:#761b32;font-size:24pt;line-height:1}.total span{display:block;margin-top:1mm;font-size:7pt}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin:5mm 0}.summary div{padding:3mm;border:1px solid #e4d8d0;border-radius:3mm;background:#faf7f4}.summary b{display:block;color:#761b32;font-size:15pt}.summary span{font-size:7.5pt;color:#76656b}.complaints{display:grid;gap:3mm}.complaint-card{display:grid;grid-template-columns:11mm 1fr;border:1px solid #ddd2cb;border-radius:3mm;overflow:hidden;break-inside:avoid;page-break-inside:avoid}.card-index{display:flex;align-items:center;justify-content:center;background:#f3ebe6;color:#761b32;font-size:10pt;font-weight:900}.card-main{padding:3mm 3.5mm}.card-main header{display:flex;justify-content:space-between;align-items:flex-start;gap:5mm}.card-main header strong{display:block;font-size:10.5pt}.card-main header span{display:block;margin-top:.8mm;color:#806d73;font-size:7.5pt}.status{white-space:nowrap;padding:1.4mm 2.5mm;border-radius:999px;font-size:6.8pt;text-transform:uppercase}.status.open{background:#fff0f1;color:#9b2c35}.status.closed{background:#edf7f0;color:#2f6d46}.card-main p{margin:2.5mm 0;font-size:8.3pt;line-height:1.35}.meta{display:flex;justify-content:space-between;gap:4mm;padding-top:2mm;border-top:1px solid #eee6df;color:#7e6b71;font-size:6.7pt}.meta span{display:block}.meta b{margin-right:1.5mm;color:#4d3b41}.empty{padding:18mm 8mm;border:1px dashed #d8ccc4;border-radius:4mm;text-align:center;color:#806d73}.footer{display:flex;justify-content:space-between;gap:5mm;margin-top:5mm;padding-top:2.5mm;border-top:1px solid #d9cec7;color:#8a777d;font-size:6.5pt}@media print{.sheet{max-width:none}.complaint-card{break-inside:avoid;page-break-inside:avoid}}
 </style></head><body><main class="sheet"><section class="top"><div><p class="eyebrow">HÔTEL PARADIS · LOURDES</p><h1>Rapport journalier des plaintes</h1><p class="date">${escapeHtml(longDate(date))}</p></div><div class="total"><strong>${items.length}</strong><span>plainte(s)</span></div></section><section class="summary"><div><b>${items.length}</b><span>Total signalé</span></div><div><b>${opened}</b><span>Encore ouverte(s)</span></div><div><b>${closed}</b><span>Traitée(s)</span></div></section><section class="complaints">${rows||'<div class="empty">Aucune plainte enregistrée pour cette journée.</div>'}</section><footer class="footer"><span>Rapport généré par HospiCore · ${escapeHtml(new Date().toLocaleString('fr-FR'))}</span><span>Document interne · Hôtel Paradis Lourdes</span></footer></main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),120));<\/script></body></html>`;
}

export function ComplaintsPrintBridge(){
 const store=useOperationalStore<Complaint[]>('client-complaints',[],5000),latest=useRef(store.data);latest.current=store.data;
 useEffect(()=>{
  const onClick=(event:MouseEvent)=>{
   if(!location.pathname.startsWith('/reception/plaintes'))return;
   const target=(event.target as Element|null)?.closest<HTMLButtonElement>('button');if(!target)return;
   const isToday=target.classList.contains('complaints-report-button'),isArchive=target.title.includes('Imprimer le rapport de cette journée');if(!isToday&&!isArchive)return;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   let date=localDateKey();if(isArchive){const day=target.closest<HTMLElement>('.archive-day');const label=day?.querySelector<HTMLElement>(':scope > button > span:first-of-type')?.textContent||'';date=parseFrenchDate(label)||date}
   const items=[...latest.current].filter(item=>localDateKey(item.createdAt)===date).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
   const popup=window.open('','_blank','width=920,height=1100');if(!popup){alert("L'impression a été bloquée par le navigateur. Autorisez les fenêtres contextuelles pour HospiCore.");return}
   popup.document.open();popup.document.write(reportHtml(items,date));popup.document.close();
  };
  document.addEventListener('click',onClick,true);return()=>document.removeEventListener('click',onClick,true);
 },[]);
 return null;
}
