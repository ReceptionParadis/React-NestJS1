import { useEffect } from 'react';

function cloneForPrint(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('button,input,textarea,select').forEach((node) => {
    if (node instanceof HTMLInputElement) {
      const span = document.createElement('span');
      span.textContent = node.value || '—';
      span.className = 'print-value';
      node.replaceWith(span);
      return;
    }
    if (node instanceof HTMLTextAreaElement) {
      const span = document.createElement('span');
      span.textContent = node.value || '—';
      span.className = 'print-value';
      node.replaceWith(span);
      return;
    }
    if (node instanceof HTMLSelectElement) {
      const span = document.createElement('span');
      span.textContent = node.options[node.selectedIndex]?.text || node.value || '—';
      span.className = 'print-value';
      node.replaceWith(span);
      return;
    }
    node.remove();
  });
  clone.querySelectorAll('.group-control-lock, footer').forEach((node) => node.remove());
  return clone;
}

function printControl(modal: HTMLElement) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  const printable = cloneForPrint(modal);
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Contrôle Groupe</title><style>
    @page{size:A4 portrait;margin:8mm}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#fff;color:#2b1d21;font-family:Arial,Helvetica,sans-serif;font-size:9px}
    body{width:194mm;min-height:281mm;margin:0 auto}
    .group-control-modal{position:static!important;inset:auto!important;width:100%!important;max-width:none!important;max-height:none!important;height:auto!important;overflow:visible!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;padding:0!important}
    .group-control-title{display:flex!important;justify-content:space-between!important;align-items:flex-start!important;border-bottom:2px solid #7d1730!important;padding:0 0 7px!important;margin:0 0 7px!important}
    .group-control-title p{margin:0 0 2px!important;color:#967b82!important;font-size:7px!important;text-transform:uppercase!important;letter-spacing:.12em!important;font-weight:700!important}
    .group-control-title h2{margin:0!important;color:#7d1730!important;font-size:18px!important}
    .control-print-summary{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:5px!important;margin:0 0 6px!important}
    .control-print-summary>div,.control-commercial,.control-leader,.control-room-types,.control-age-groups,.control-meal-table,.control-discounts{border:1px solid #ded1ca!important;border-radius:6px!important;background:#fff!important;padding:6px!important;margin:0 0 6px!important;break-inside:avoid!important}
    .control-print-summary span,label,.control-signature span{display:block!important;color:#92777e!important;font-size:6.8px!important;text-transform:uppercase!important;font-weight:700!important;letter-spacing:.05em!important}
    .control-print-summary strong{display:block!important;font-size:9px!important;margin-top:2px!important}
    h3{margin:0 0 5px!important;color:#7d1730!important;font-size:9px!important;text-transform:uppercase!important}
    .control-commercial>div,.control-leader>div,.control-room-types>div,.control-age-groups>div{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:5px!important}
    .print-value{display:block!important;margin-top:2px!important;padding:3px 4px!important;border:1px solid #e4d8d1!important;border-radius:4px!important;color:#2b1d21!important;font-size:8.5px!important;text-transform:none!important;font-weight:600!important;min-height:20px!important}
    .control-results{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:5px!important;margin:0 0 6px!important}
    .control-results article{border:1px solid #ded1ca!important;border-radius:6px!important;padding:6px!important;text-align:center!important}
    .control-results span{display:block!important;color:#92777e!important;font-size:6.8px!important;text-transform:uppercase!important}
    .control-results strong{display:block!important;color:#7d1730!important;font-size:14px!important;margin-top:2px!important}
    table{width:100%!important;border-collapse:collapse!important;font-size:7.5px!important}
    th,td{border:1px solid #ded1ca!important;padding:3px 4px!important;text-align:left!important}
    th{background:#f6f0ec!important;color:#7d1730!important;text-transform:uppercase!important;font-size:6.5px!important}
    .control-discounts{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:5px!important}
    .control-discounts h3{grid-column:1/-1!important}
    .control-discounts p{margin:0!important;padding:5px!important;background:#faf7f4!important;border-radius:5px!important;text-align:center!important}
    .control-signature{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:12px!important;margin-top:8px!important;padding-top:7px!important;border-top:1px solid #cdbab2!important;break-inside:avoid!important}
    .control-signature>div{min-height:28px!important;border-top:1px solid #8f777d!important;padding-top:4px!important}
    .control-signature strong{font-size:8px!important}
    svg{width:12px!important;height:12px!important}
    @media print{html,body{width:210mm;height:297mm}body{width:194mm}.group-control-modal{page-break-after:avoid!important}}
  </style></head><body></body></html>`);
  doc.close();
  doc.body.appendChild(doc.importNode(printable, true));

  const runPrint = () => {
    const win = iframe.contentWindow;
    if (!win) {
      iframe.remove();
      return;
    }
    win.focus();
    win.print();
    window.setTimeout(() => iframe.remove(), 1200);
  };

  if (doc.readyState === 'complete') window.setTimeout(runPrint, 120);
  else iframe.addEventListener('load', () => window.setTimeout(runPrint, 120), { once: true });
}

export function GroupControlPrintRecovery() {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('.control-print') as HTMLButtonElement | null;
      if (!button || button.disabled || !location.pathname.includes('/reception/controles')) return;
      const modal = button.closest('.group-control-modal') as HTMLElement | null;
      if (!modal) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      printControl(modal);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);
  return null;
}
