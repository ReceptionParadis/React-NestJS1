import { useEffect } from 'react';

function cloneForPrint(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;

  clone.querySelectorAll('button,input,textarea,select').forEach((node) => {
    if (node instanceof HTMLInputElement) {
      if (node.type === 'checkbox') {
        const span = document.createElement('span');
        span.className = `print-check ${node.checked ? 'checked' : ''}`;
        span.textContent = node.checked ? '✓ Oui' : 'Non';
        node.replaceWith(span);
        return;
      }
      const span = document.createElement('span');
      span.textContent = node.value || '—';
      span.className = 'print-value';
      node.replaceWith(span);
      return;
    }
    if (node instanceof HTMLTextAreaElement) {
      const span = document.createElement('span');
      span.textContent = node.value || '—';
      span.className = 'print-value print-value-long';
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

  clone.querySelectorAll('.group-control-lock, footer, .control-save, .control-delete, .control-print').forEach((node) => node.remove());
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
  doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Contrôle Groupe</title><style>
    @page{size:A4 portrait;margin:10mm 11mm 11mm}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#fff;color:#24191d;font-family:Arial,Helvetica,sans-serif}
    body{width:188mm;margin:0 auto;font-size:10.5pt;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}

    .group-control-modal{position:static!important;inset:auto!important;width:100%!important;max-width:none!important;max-height:none!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;color:#24191d!important}

    .group-control-title{display:flex!important;justify-content:space-between!important;align-items:flex-end!important;gap:10mm!important;margin:0 0 5mm!important;padding:0 0 4mm!important;border-bottom:2.2px solid #7b1931!important;break-after:avoid!important;page-break-after:avoid!important}
    .group-control-title p{margin:0 0 1mm!important;color:#92767e!important;font-size:8pt!important;font-weight:800!important;letter-spacing:.1em!important;text-transform:uppercase!important}
    .group-control-title h2{margin:0!important;color:#7b1931!important;font-size:22pt!important;line-height:1.05!important;overflow-wrap:anywhere!important}

    .control-print-summary{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:3mm!important;margin:0 0 4mm!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .control-print-summary>div{min-width:0!important;padding:3mm!important;border:1px solid #ded1ca!important;border-radius:2mm!important;background:#faf7f4!important}
    .control-print-summary span,.control-print-summary label{display:block!important;margin:0 0 1mm!important;color:#8f737b!important;font-size:7.5pt!important;font-weight:800!important;letter-spacing:.04em!important;text-transform:uppercase!important}
    .control-print-summary strong{display:block!important;color:#251a1e!important;font-size:10.5pt!important;line-height:1.25!important;overflow-wrap:anywhere!important}

    .control-commercial,.control-leader,.control-room-types,.control-age-groups,.control-meal-table,.control-discounts,.control-signature,.control-results,.control-wakeup,.control-dietary,.control-notes,.control-payment,.control-rooms{margin:0 0 4mm!important;border:1px solid #ded1ca!important;border-radius:2.5mm!important;background:#fff!important;padding:3.5mm!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .control-commercial h3,.control-leader h3,.control-room-types h3,.control-age-groups h3,.control-meal-table h3,.control-discounts h3,.control-wakeup h3,.control-dietary h3,.control-notes h3,.control-payment h3,.control-rooms h3{margin:0 0 2.5mm!important;color:#7b1931!important;font-size:10pt!important;font-weight:900!important;letter-spacing:.03em!important;text-transform:uppercase!important}

    .control-commercial>div,.control-leader>div,.control-room-types>div,.control-age-groups>div,.control-wakeup>div,.control-dietary>div,.control-payment>div,.control-rooms>div{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:3mm 5mm!important}
    label{display:block!important;min-width:0!important;color:#8f737b!important;font-size:7.8pt!important;font-weight:800!important;letter-spacing:.03em!important;text-transform:uppercase!important}
    .print-value{display:block!important;margin-top:1.2mm!important;padding:2.1mm 2.4mm!important;min-height:8mm!important;border:1px solid #e1d7d1!important;border-radius:1.7mm!important;background:#fbf9f7!important;color:#24191d!important;font-size:10pt!important;font-weight:700!important;line-height:1.25!important;text-transform:none!important;letter-spacing:0!important;overflow-wrap:anywhere!important;white-space:normal!important}
    .print-value-long{min-height:13mm!important;font-weight:600!important}
    .print-check{display:inline-flex!important;align-items:center!important;min-height:7mm!important;margin-top:1.2mm!important;padding:1.5mm 2.2mm!important;border:1px solid #e1d7d1!important;border-radius:1.7mm!important;background:#fbf9f7!important;color:#65545a!important;font-size:9.5pt!important;font-weight:700!important;text-transform:none!important}
    .print-check.checked{background:#edf7ef!important;border-color:#b8d8c1!important;color:#21683a!important}

    .control-results{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:3mm!important;padding:0!important;border:0!important;background:transparent!important}
    .control-results article{min-width:0!important;padding:3mm 2mm!important;border:1px solid #d9ccc5!important;border-radius:2mm!important;background:#faf7f4!important;text-align:center!important}
    .control-results span{display:block!important;color:#92767e!important;font-size:7pt!important;font-weight:800!important;letter-spacing:.04em!important;text-transform:uppercase!important}
    .control-results strong{display:block!important;margin-top:1mm!important;color:#7b1931!important;font-size:16pt!important;line-height:1!important}

    .control-meal-table{padding:0!important;overflow:visible!important;break-inside:auto!important;page-break-inside:auto!important}
    .control-meal-table h3{padding:3.5mm 3.5mm 1mm!important;margin:0!important}
    .control-meal-table table{display:table!important;width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;font-size:9pt!important}
    .control-meal-table thead{display:table-header-group!important}
    .control-meal-table tbody{display:table-row-group!important}
    .control-meal-table tr{display:table-row!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .control-meal-table th,.control-meal-table td{display:table-cell!important;padding:2.2mm 2mm!important;border:1px solid #ded1ca!important;vertical-align:middle!important;text-align:left!important;overflow-wrap:anywhere!important}
    .control-meal-table th{background:#f3ece8!important;color:#6f1d2f!important;font-size:7.5pt!important;font-weight:900!important;letter-spacing:.03em!important;text-transform:uppercase!important}
    .control-meal-table td{color:#2c2024!important;font-size:9pt!important}
    .control-meal-table td .print-value{min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;font-size:9pt!important}

    .control-discounts{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:2.5mm!important}
    .control-discounts h3{grid-column:1/-1!important;margin-bottom:0!important}
    .control-discounts p{margin:0!important;padding:2.5mm!important;border-radius:1.8mm!important;background:#faf7f4!important;color:#35272c!important;font-size:9pt!important;text-align:center!important}

    .control-signature{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8mm!important;margin-top:5mm!important;padding:4mm 0 0!important;border:0!important;border-top:1px solid #cdbab2!important;border-radius:0!important}
    .control-signature>div{min-height:18mm!important;padding-top:2mm!important;border-top:1px solid #8f777d!important}
    .control-signature span{display:block!important;color:#92767e!important;font-size:7pt!important;font-weight:800!important;text-transform:uppercase!important}
    .control-signature strong{display:block!important;margin-top:1.5mm!important;color:#281c20!important;font-size:9pt!important}

    p{orphans:3;widows:3}
    svg{width:4mm!important;height:4mm!important;stroke-width:1.7!important}
    a{color:#24191d!important;text-decoration:none!important}

    .print-document-footer{margin-top:5mm;padding-top:2.5mm;border-top:1px solid #e1d7d1;color:#8e7b80;font-size:7.5pt;text-align:center}

    @media print{
      html,body{width:auto!important;height:auto!important;overflow:visible!important}
      body{width:188mm!important}
      .group-control-modal{page-break-after:avoid!important}
      .control-meal-table{break-inside:auto!important;page-break-inside:auto!important}
    }
  </style></head><body></body></html>`);
  doc.close();
  doc.body.appendChild(doc.importNode(printable, true));

  const footer = doc.createElement('div');
  footer.className = 'print-document-footer';
  footer.textContent = `HospiCore · Hôtel Paradis Lourdes · Contrôle Groupe · ${new Date().toLocaleString('fr-FR')}`;
  doc.body.appendChild(footer);

  const runPrint = () => {
    const win = iframe.contentWindow;
    if (!win) {
      iframe.remove();
      return;
    }
    win.focus();
    win.print();
    window.setTimeout(() => iframe.remove(), 1500);
  };

  if (doc.readyState === 'complete') window.setTimeout(runPrint, 160);
  else iframe.addEventListener('load', () => window.setTimeout(runPrint, 160), { once: true });
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
