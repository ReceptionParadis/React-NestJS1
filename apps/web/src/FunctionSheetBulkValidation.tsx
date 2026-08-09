import { useEffect, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { createPortal } from 'react-dom';
import { can, currentRole } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type LineStatus = 'À relire' | 'Validée';
type FunctionLine = { id: string; lineStatus?: LineStatus; validatedBy?: string; validatedAt?: string; [key: string]: unknown };
type WeeklySheet = { id: string; weekStart: string; status?: string; lines?: FunctionLine[]; validatedForPrintBy?: string; validatedForPrintAt?: string; lockedBy?: string; lockedAt?: string; [key: string]: unknown };

function sessionUser() {
  try {
    const session = JSON.parse(localStorage.getItem('hospicore.session') || '{}');
    const value = session.user || {};
    return `${value.firstName || 'Utilisateur'} ${value.lastName || 'HospiCore'}`.trim();
  } catch {
    return 'Utilisateur HospiCore';
  }
}
function stamp() { return new Date().toLocaleString('fr-FR'); }
function displayedWeekStart() {
  const text = document.querySelector<HTMLElement>('.weekly-nav strong')?.textContent || '';
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

export function FunctionSheetBulkValidation() {
  const store = useOperationalStore<WeeklySheet[]>('function-sheets', []);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const allowed = can('commercial.edit', currentRole());

  useEffect(() => {
    if (!allowed || !window.location.pathname.startsWith('/reception/fiche-fonction')) {
      setMount(null);
      return;
    }
    const attach = () => {
      const footer = document.querySelector<HTMLElement>('.function-sheet-footer');
      if (!footer) return;
      let node = footer.querySelector<HTMLElement>('.function-validate-all-mount');
      if (!node) {
        node = document.createElement('div');
        node.className = 'function-validate-all-mount';
        footer.appendChild(node);
      }
      setMount(previous => previous === node ? previous : node);
    };
    attach();
    const observer = new MutationObserver(() => queueMicrotask(attach));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.querySelectorAll('.function-validate-all-mount').forEach(node => node.remove());
      setMount(null);
    };
  }, [allowed]);

  if (!allowed || !mount) return null;
  const weekStart = displayedWeekStart();
  const sheet = store.data.find(item => item.weekStart === weekStart);
  const pending = (sheet?.lines || []).filter(line => line.lineStatus !== 'Validée').length;

  async function validateAll() {
    if (!sheet || !(sheet.lines || []).length || pending === 0) return;
    const at = stamp();
    const by = sessionUser();
    const lines: FunctionLine[] = (sheet.lines || []).map(line => ({
      ...line,
      lineStatus: 'Validée' as LineStatus,
      validatedBy: by,
      validatedAt: at,
    }));
    const next: WeeklySheet[] = store.data.map(item => item.id === sheet.id ? {
      ...item,
      lines,
      status: 'Préparation',
      validatedForPrintBy: '',
      validatedForPrintAt: '',
      lockedBy: '',
      lockedAt: '',
    } : item);
    await store.save(next);
  }

  return createPortal(
    <button type="button" className="function-validate-all" disabled={!pending} onClick={() => void validateAll()}>
      <CheckCheck size={17}/>
      {pending ? `Valider toute la fiche (${pending})` : 'Toute la fiche est validée'}
    </button>,
    mount,
  );
}
