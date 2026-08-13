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

function ensureCashierName(source: HTMLElement, clone: HTMLElement) {
  if (!source.classList.contains('cash-sheet')) return;
  const sourceInput = source.querySelector<HTMLInputElement>('.cash-meta label:first-child input');
  const cloneInput = clone.querySelector<HTMLInputElement>('.cash-meta label:first-child input');
  if (!cloneInput) return;

  const signatureName = source.querySelector<HTMLElement>('.cash-signatures > div:nth-child(2) strong')?.textContent?.trim() || '';
  const cashierName = sourceInput?.value?.trim() || sourceInput?.getAttribute('value')?.trim() || signatureName || 'Caissier non renseigné';
  cloneInput.value = cashierName;
  cloneInput.setAttribute('value', cashierName);
  cloneInput.defaultValue = cashierName;
  cloneInput.setAttribute('aria-label', `Caissier : ${cashierName}`);
}

function printableDate(value: string) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function materializeCashFields(source: HTMLElement, clone: HTMLElement) {
  if (!source.classList.contains('cash-sheet')) return;

  const sourceFields = Array.from(source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select'));
  const cloneFields = Array.from(clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select'));

  sourceFields.forEach((field, index) => {
    const target = cloneFields[index];
    if (!target || !target.parentElement) return;

    if (field instanceof HTMLInputElement && target instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
      target.checked = field.checked;
      target.defaultChecked = field.checked;
      if (field.checked) target.setAttribute('checked', 'checked');
      else target.removeAttribute('checked');
      return;
    }

    let value = '';
    if (field instanceof HTMLInputElement) value = field.type === 'date' ? printableDate(field.value) : field.value;
    else if (field instanceof HTMLTextAreaElement) value = field.value;
    else if (field instanceof HTMLSelectElement) value = field.selectedOptions[0]?.textContent?.trim() || field.value;

    const replacement = document.createElement(field instanceof HTMLTextAreaElement ? 'div' : 'span');
    replacement.className = `cash-print-field-value${field instanceof HTMLTextAreaElement ? ' cash-print-textarea-value' : ''}`;
    replacement.textContent = value || '—';
    replacement.setAttribute('data-print-value', value || '—');
    target.replaceWith(replacement);
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
  ensureCashierName(source, clone);
  materializeCashFields(source, clone);

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

      body.hospicore-operational-printing #${PRINT_ROOT_ID} .cash-print-field-value{display:block!important;box-sizing:border-box!important;min-height:20px!important;padding:5px 6px!important;background:#f3f0ed!important;color:#2c2527!important;font-weight:800!important;font-size:9px!important;line-height:1.15!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .cash-meta .cash-print-field-value{width:100%!important;margin-top:4px!important;border:1px solid #d8cdc5!important;border-radius:6px!important;background:#fffaf2!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .cash-row .amount .cash-print-field-value{width:66px!important;min-height:0!important;padding:6px 4px!important;background:transparent!important;text-align:right!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .denom-row .cash-print-field-value{width:44px!important;min-height:0!important;margin:auto!important;padding:4px!important;border:1px solid #d7cabf!important;border-radius:5px!important;background:#fffaf2!important;text-align:center!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .cash-reconcile label .cash-print-field-value{width:82px!important;min-height:0!important;padding:6px!important;border:1px solid #d5c8bd!important;border-radius:5px!important;background:#fff6d8!important;text-align:right!important;font-size:12px!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .cash-print-textarea-value{width:100%!important;min-height:28px!important;padding:6px!important;border:1px solid #d8cec6!important;border-radius:5px!important;background:#f7f4f1!important;font-weight:600!important;white-space:pre-wrap!important}
      body.hospicore-operational-printing #${PRINT_ROOT_ID} .staple-zone .cash-print-textarea-value{position:absolute!important;left:5px!important;right:5px!important;bottom:5px!important;width:auto!important;min-height:22px!important}
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
