import { useEffect } from 'react';

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

function waitForStyles(doc: Document) {
  const links = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  const waits = links.map(link => new Promise<void>(resolve => {
    if (link.sheet) {
      resolve();
      return;
    }
    const done = () => resolve();
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', done, { once: true });
    window.setTimeout(done, 1600);
  }));
  return Promise.all(waits);
}

function nextPaint(win: Window) {
  return new Promise<void>(resolve => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve())));
}

function isolatedPrint(selector: string, title: string, bodyClass: string) {
  const source = document.querySelector<HTMLElement>(selector);
  if (!source) return false;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '1px',
    height: '1px',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body class="${bodyClass}"></body></html>`);
  doc.close();

  document.head.querySelectorAll('style,link[rel="stylesheet"]').forEach(node => {
    doc.head.appendChild(doc.importNode(node, true));
  });

  const printOverrides = doc.createElement('style');
  printOverrides.textContent = `
    @page{size:A4 portrait;margin:8mm}
    html,body{margin:0!important;padding:0!important;background:#fff!important;width:auto!important;min-height:0!important;overflow:visible!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{font-family:inherit!important}
    body>*{margin-left:auto!important;margin-right:auto!important}
    .cash-sheet{width:194mm!important;max-width:none!important;min-height:auto!important;margin:0 auto!important;padding:7mm 8mm!important;box-shadow:none!important;overflow:visible!important}
    .night-route-sheet{width:194mm!important;max-width:none!important;min-height:auto!important;margin:0 auto!important;padding:0!important;box-shadow:none!important;overflow:visible!important}
    .night-route-sheet section,.night-block,.cash-sheet section,.cash-core-grid,.cash-attachment,.cash-signatures{break-inside:avoid;page-break-inside:avoid}
    .night-note-footer button,.no-print{display:none!important}
    svg{display:inline-block!important;vertical-align:middle}
  `;
  doc.head.appendChild(printOverrides);

  const clone = source.cloneNode(true) as HTMLElement;
  syncFormState(source, clone);
  doc.body.appendChild(doc.importNode(clone, true));

  const run = async () => {
    const win = iframe.contentWindow;
    if (!win) {
      iframe.remove();
      return;
    }
    await waitForStyles(doc);
    try {
      if ('fonts' in doc) await (doc as Document & { fonts: FontFaceSet }).fonts.ready;
    } catch {
      // Impression possible même si une police web échoue.
    }
    await nextPaint(win);
    win.focus();
    win.print();
    window.setTimeout(() => iframe.remove(), 2200);
  };

  void run();
  return true;
}

export function OperationalPrintRecovery() {
  useEffect(() => {
    const nativePrint = window.print.bind(window);
    const wrappedPrint = () => {
      const path = window.location.pathname;
      if (path.startsWith('/reception/caisse')) {
        if (isolatedPrint('.cash-sheet', 'Feuille de caisse', 'cash-page')) return;
      }
      if (path.startsWith('/reception/feuille-route-veilleur')) {
        if (isolatedPrint('.night-route-sheet', 'Feuille de route veilleur', 'night-route-page')) return;
      }
      nativePrint();
    };

    window.print = wrappedPrint;
    return () => {
      if (window.print === wrappedPrint) window.print = nativePrint;
    };
  }, []);

  return null;
}
