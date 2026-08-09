import { useEffect } from 'react';

const BACKUP_ATTR = 'data-hospicore-print-backup';

function backup(element: HTMLElement) {
  if (!element.hasAttribute(BACKUP_ATTR)) element.setAttribute(BACKUP_ATTR, element.innerHTML);
}

function prepareFunctionSheetPrint() {
  if (!window.location.pathname.startsWith('/reception/fiche-fonction')) return;

  document.querySelectorAll<HTMLElement>('.print-group-card').forEach(card => {
    card.querySelectorAll<HTMLElement>('.print-block.accounting p').forEach(paragraph => {
      if (/acompte\s*:/i.test(paragraph.textContent || '')) {
        backup(paragraph);
        paragraph.style.display = 'none';
      }
    });

    card.querySelectorAll<HTMLElement>('.print-block.meals p').forEach(paragraph => {
      const text = (paragraph.textContent || '').trim();

      if (/^Type de PDJ\s*:/i.test(text)) {
        backup(paragraph);
        paragraph.style.display = 'none';
        return;
      }

      if (!/^Planning\s*:/i.test(text)) return;
      backup(paragraph);
      const raw = text.replace(/^Planning\s*:\s*/i, '');
      const packed = raw
        .split(/\s*·\s*/)
        .map(part => part.trim())
        .filter(part => /Panier\s+(midi|soir)/i.test(part));

      if (!packed.length) {
        paragraph.style.display = 'none';
        return;
      }

      paragraph.style.display = '';
      paragraph.innerHTML = `<b>Paniers repas :</b> ${packed.join(' · ')}`;
    });
  });
}

function restoreFunctionSheetPrint() {
  document.querySelectorAll<HTMLElement>(`[${BACKUP_ATTR}]`).forEach(element => {
    element.innerHTML = element.getAttribute(BACKUP_ATTR) || '';
    element.removeAttribute(BACKUP_ATTR);
    element.style.display = '';
  });
}

export function FunctionSheetPrintCleanup() {
  useEffect(() => {
    window.addEventListener('beforeprint', prepareFunctionSheetPrint);
    window.addEventListener('afterprint', restoreFunctionSheetPrint);
    return () => {
      window.removeEventListener('beforeprint', prepareFunctionSheetPrint);
      window.removeEventListener('afterprint', restoreFunctionSheetPrint);
      restoreFunctionSheetPrint();
    };
  }, []);
  return null;
}
