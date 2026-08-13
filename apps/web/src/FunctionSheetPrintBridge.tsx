import { useEffect } from 'react';

function printDocumentMarkup() {
  // Reuse the existing function-sheet cleanup before cloning the printable DOM.
  window.dispatchEvent(new Event('beforeprint'));
  const header = document.querySelector<HTMLElement>('.print-header')?.cloneNode(true) as HTMLElement | undefined;
  const groups = document.querySelector<HTMLElement>('.print-groups')?.cloneNode(true) as HTMLElement | undefined;
  const footer = document.querySelector<HTMLElement>('.print-footer')?.cloneNode(true) as HTMLElement | undefined;
  window.dispatchEvent(new Event('afterprint'));

  if (!header || !groups) return null;
  return `${header.outerHTML}${groups.outerHTML}${footer?.outerHTML || ''}`;
}

function openFunctionSheetPrint() {
  const markup = printDocumentMarkup();
  if (!markup) {
    window.alert("Impossible de préparer la fiche de fonction pour l'impression. Actualisez la page puis réessayez.");
    return;
  }

  // Open synchronously from the user's click so Firefox does not treat it as a popup.
  const popup = window.open('', '_blank');
  if (!popup) {
    window.alert("L'aperçu d'impression a été bloqué par le navigateur. Autorisez les fenêtres pour HospiCore puis réessayez.");
    return;
  }
  try { popup.opener = null; } catch { /* noop */ }

  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Fiche de fonction · Hôtel Paradis</title>
<style>
@page{size:A4 landscape;margin:8mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#21191c;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{padding:0}
.print-header{display:flex!important;justify-content:space-between;align-items:flex-end;padding-bottom:4mm;margin-bottom:4mm;border-bottom:2px solid #6f1d2f;break-after:avoid}
.print-header strong{font-size:9px;letter-spacing:.12em;color:#6f1d2f}
.print-header h1{margin:1.5mm 0 .8mm;font-size:20px;color:#241b1e}
.print-header p{margin:0;font-size:10px;color:#5e4b50}
.print-header>div:last-child{display:grid;gap:2px;text-align:right;font-size:8px;color:#5e4b50}
.print-groups{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:4mm;align-items:start}
.print-group-card{display:block!important;break-inside:avoid;page-break-inside:avoid;border:1.4px solid #5d4b50;border-radius:2mm;overflow:hidden;background:#fff}
.print-group-card>header{display:flex;justify-content:space-between;align-items:flex-start;padding:2.4mm 3mm;background:#6f1d2f!important;color:#fff!important}
.print-group-card>header strong{display:block;font-size:12px;line-height:1.2}
.print-group-card>header span,.print-group-card>header small{display:block;margin-top:.8mm;font-size:7.5px;line-height:1.3}
.print-group-card>header div:last-child{text-align:right;max-width:46%}
.print-group-card>header b{display:inline-block;padding:.7mm 1.5mm;border-radius:999px;background:#fff!important;color:#6f1d2f!important;font-size:7px}
.print-block-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0}
.print-block{min-height:19mm;padding:2.2mm;border-right:1px solid #b7aaa5;border-bottom:1px solid #b7aaa5;overflow-wrap:anywhere}
.print-block:nth-child(2n){border-right:0}
.print-block h2{margin:-2.2mm -2.2mm 1.5mm;padding:1.2mm 2.2mm;border-bottom:1px solid #b7aaa5;background:#eee8e1!important;color:#4b1522!important;font-size:7.5px;text-transform:uppercase;letter-spacing:.05em}
.print-block p{margin:0 0 1mm;font-size:7.4px;line-height:1.3}
.print-block b{color:#4b1522}
.print-block.accounting{background:#fff7f8!important}
.print-footer{display:flex!important;justify-content:space-between;margin-top:4mm;padding-top:2mm;border-top:1px solid #777;font-size:7px;color:#66565b}
@media print{body{padding:0}.print-groups{gap:3.5mm}}
</style></head><body>${markup}</body></html>`);
  popup.document.close();

  const runPrint = () => {
    try {
      popup.focus();
      popup.print();
    } catch {
      popup.close();
      window.alert("L'impression n'a pas pu démarrer. Réessayez après avoir actualisé la page.");
    }
  };

  // Give Firefox one paint cycle to lay out the freshly written document.
  if (popup.document.readyState === 'complete') {
    popup.requestAnimationFrame(() => popup.requestAnimationFrame(runPrint));
  } else {
    popup.addEventListener('load', () => popup.requestAnimationFrame(() => popup.requestAnimationFrame(runPrint)), { once: true });
  }
}

export function FunctionSheetPrintBridge() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!window.location.pathname.startsWith('/reception/fiche-fonction')) return;
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>('.weekly-print');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openFunctionSheetPrint();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}
