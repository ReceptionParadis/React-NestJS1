import { useEffect } from 'react';
import { useOperationalStore } from './useOperationalStore';

const BACKUP_ATTR = 'data-hospicore-print-backup';

type MealCell = { pax?: number; time?: string };
type MealDay = { date: string; pdjBox?: MealCell; packedLunch?: MealCell; packedDinner?: MealCell };
type Group360 = { id: string; name?: string; mealDays?: MealDay[] };

function backup(element: HTMLElement) {
  if (!element.hasAttribute(BACKUP_ATTR)) element.setAttribute(BACKUP_ATTR, element.innerHTML);
}

function shortDate(value: string) {
  if (!value) return '—';
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function specialMealLines(group?: Group360) {
  const result: string[] = [];
  for (const day of group?.mealDays || []) {
    const rows: Array<[string, MealCell | undefined]> = [
      ['PDJ Box', day.pdjBox],
      ['Panier midi', day.packedLunch],
      ['Panier soir', day.packedDinner],
    ];
    for (const [label, meal] of rows) {
      const pax = Number(meal?.pax || 0);
      if (pax <= 0) continue;
      result.push(`${shortDate(day.date)} · ${label} · ${pax} pax${meal?.time ? ` · ${meal.time}` : ''}`);
    }
  }
  return result;
}

function restoreFunctionSheetPrint() {
  document.querySelectorAll<HTMLElement>(`[${BACKUP_ATTR}]`).forEach(element => {
    element.innerHTML = element.getAttribute(BACKUP_ATTR) || '';
    element.removeAttribute(BACKUP_ATTR);
    element.style.display = '';
  });
}

export function FunctionSheetPrintCleanup() {
  const groupsStore = useOperationalStore<Group360[]>('group-360', []);

  useEffect(() => {
    const prepareFunctionSheetPrint = () => {
      if (!window.location.pathname.startsWith('/reception/fiche-fonction')) return;

      document.querySelectorAll<HTMLElement>('.print-group-card').forEach(card => {
        card.querySelectorAll<HTMLElement>('.print-block.accounting p').forEach(paragraph => {
          if (/acompte\s*:/i.test(paragraph.textContent || '')) {
            backup(paragraph);
            paragraph.style.display = 'none';
          }
        });

        const groupName = card.querySelector<HTMLElement>('header strong')?.textContent?.trim() || '';
        const group = groupsStore.data.find(item => String(item.name || '').trim() === groupName);
        const specials = specialMealLines(group);

        card.querySelectorAll<HTMLElement>('.print-block.meals p').forEach(paragraph => {
          const text = (paragraph.textContent || '').trim();

          if (/^Type de PDJ\s*:/i.test(text)) {
            backup(paragraph);
            paragraph.style.display = 'none';
            return;
          }

          if (/^Planning\s*:/i.test(text)) {
            backup(paragraph);
            if (!specials.length) {
              paragraph.style.display = 'none';
              return;
            }
            paragraph.style.display = '';
            paragraph.innerHTML = `<b>PDJ Box / paniers repas :</b> ${specials.join(' · ')}`;
            return;
          }

          // Les allergies / régimes restent imprimés. Toute autre ligne d'effectifs repas est masquée.
          if (!/Allergies\s*\/\s*régimes\s*:/i.test(text)) {
            backup(paragraph);
            paragraph.style.display = 'none';
          }
        });
      });
    };

    window.addEventListener('beforeprint', prepareFunctionSheetPrint);
    window.addEventListener('afterprint', restoreFunctionSheetPrint);
    return () => {
      window.removeEventListener('beforeprint', prepareFunctionSheetPrint);
      window.removeEventListener('afterprint', restoreFunctionSheetPrint);
      restoreFunctionSheetPrint();
    };
  }, [groupsStore.data]);

  return null;
}
