import { useEffect } from 'react';

const PRINT_ROOT_ID = 'hospicore-operational-print-root';
const PRINT_STYLE_ID = 'hospicore-operational-print-style';

function syncFormState(source: HTMLElement, clone: HTMLElement) {
  const sourceFields = source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select');
  const cloneFields = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select');
  sourceFields.forEach((field, index) => {
    const target = cloneFields[index];
    if (!target) return;
    if (field instanceof HTMLInputElement && target instanceof HTMLInputElement) {
      target.value = field.value;
      target.setAttribute('value', field.value);
      target.checked = field.checked;
      if (field.checked) target.setAttribute('checked', 'checked');
      else target.removeAttribute('checked');
      return;
    }
    if (field instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) {
      target.value = field.value;
      target.textContent = field.value;
      return;
    }
    if (field instanceof HTMLSelectElement && target instanceof HTMLSelectElement) {
      target.value = field.value;
      Array.from(target.options).forEach(option => option.selected = option.value === field.value);
    }
  });
}

function cleanupPrintRoot() {
  document.getElementById(PRINT_ROOT_ID)?.remove();
  document.getElementById(PRINT_STYLE_ID)?.remove();
  document.documentElement.classList.remove('hospicore-operational-printing');
  document.body.classList.remove('hospicore-operational-printing');
}

function preparePrintRoot(selector: string, bodyClass: string) {
  cleanupPrintRoot();
  const source = document.querySelector<HTMLElement>(selector);
  if (!source) return false;

  const clone = source.cloneNode(true) as HTMLElement;
  syncFormState(source, clone);

  const root = document.createElement('div');
  root.id = PRINT_ROOT_ID;
  root.className = `${bodyClass} hospicore-print-document`;
  root.setAttribute('aria-hidden', 'true');
  root.appendChild(clone);
  document.body.appendChild(root);

  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    #${PRINT_ROOT_ID}{display:none}
    @media print{
      @page{size:A4 portrait;margin:8mm}
      html.hospicore-operational-printing,
      html.hospicore-operational-printing body{margin:0!important;padding:0!important;background:#fff!important;width:auto!important;min-height:0!important;overflow:visible!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body.hospicore-operational-printing > *:not(#${PRINT_ROOT_ID}){display:none!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID}{display:block!important;position:static!important;width:100%!important;min-height:0!important;margin:0!important;padding:0!important;background:#fff!important;visibility:visible!important;opacity:1!important;overflow:visible!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID},
      body.hospicore-operational-printing #${PRINT_ROOT_ID} *{visibility:visible!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID}.cash-page,
      body.hospicore-operational-printing #${PRINT_ROOT_ID}.night-route-page{padding:0!important;background:#fff!important;min-height:0!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .cash-sheet{display:block!important;width:100%!important;max-width:none!important;min-height:auto!important;margin:0!important;padding:7mm 8mm!important;box-shadow:none!important;overflow:visible!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .night-route-sheet{display:block!important;width:100%!important;max-width:none!important;min-height:auto!important;margin:0!important;padding:0!important;box-shadow:none!important;overflow:visible!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .night-route-sheet section,
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .night-block,
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .cash-sheet section,
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .cash-core-grid,
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .cash-attachment,
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .cash-signatures{break-inside:avoid;page-break-inside:avoid}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .night-note-footer button,
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .no-print{display:none!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} svg{display:inline-block!important;vertical-align:middle}
    }
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add('hospicore-operational-printing');
  document.body.classList.add('hospicore-operational-printing');
  return true;
}

export function OperationalPrintRecovery() {
  useEffect(() => {
    const nativePrint = window.print.bind(window);
    let cleanupTimer: number | null = null;

    const afterPrint = () => {
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      cleanupTimer = null;
      cleanupPrintRoot();
    };

    const wrappedPrint = () => {
      const path = window.location.pathname;
      let prepared = false;
      if (path.startsWith('/reception/caisse')) prepared = preparePrintRoot('.cash-sheet', 'cash-page');
      else if (path.startsWith('/reception/feuille-route-veilleur')) prepared = preparePrintRoot('.night-route-sheet', 'night-route-page');

      if (!prepared) {
        nativePrint();
        return;
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          nativePrint();
          cleanupTimer = window.setTimeout(cleanupPrintRoot, 8000);
        });
      });
    };

    window.addEventListener('afterprint', afterPrint);
    window.print = wrappedPrint;
    return () => {
      window.removeEventListener('afterprint', afterPrint);
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      cleanupPrintRoot();
      if (window.print === wrappedPrint) window.print = nativePrint;
    };
  }, []);

  return null;
}
