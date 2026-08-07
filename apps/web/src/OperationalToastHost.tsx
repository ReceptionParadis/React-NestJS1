import { useEffect, useRef, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import type { OperationalChangeDetail } from './useOperationalStore';

type Toast = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

const labels: Record<string, { title: string; detail: string; href: string }> = {
  'group-360': { title: 'Groupes mis à jour', detail: 'Une fiche groupe a été modifiée depuis un autre poste.', href: '/reception' },
  'function-sheets': { title: 'Fiche de fonction mise à jour', detail: 'Les données commerciales ont changé.', href: '/commercial' },
  'meeting-rooms': { title: 'Salles de réunion mises à jour', detail: 'Une réservation ou un horaire a changé.', href: '/salles-reunion' },
  'maintenance-interventions': { title: 'Maintenance mise à jour', detail: 'Une intervention a été créée ou modifiée.', href: '/tickets' },
  tasks: { title: 'Tâches mises à jour', detail: 'La liste des tâches opérationnelles a changé.', href: '/taches' },
  'general-instructions': { title: 'Consignes mises à jour', detail: 'Une consigne opérationnelle a été modifiée.', href: '/consignes-generales' },
  'operations-center': { title: 'Centre des opérations mis à jour', detail: 'Un prêt ou un équipement a changé.', href: '/centre-operations' },
};

export function OperationalToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<OperationalChangeDetail>).detail;
      if (!detail || detail.source !== 'remote') return;

      const meta = labels[detail.namespace] || {
        title: 'HospiCore mis à jour',
        detail: 'De nouvelles données viennent d’être synchronisées.',
        href: '/',
      };
      const id = `${detail.namespace}-${detail.version}-${detail.at}`;
      setToasts((current) => [{ id, ...meta }, ...current.filter((item) => item.id !== id)].slice(0, 3));

      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, 5000);
      timers.current.push(timer);
    };

    window.addEventListener('hospicore:operational-change', onChange);
    return () => {
      window.removeEventListener('hospicore:operational-change', onChange);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 9999, display: 'grid', gap: 10, width: 'min(380px, calc(100vw - 36px))' }}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 28px', gap: 10, alignItems: 'start', padding: '14px 14px', borderRadius: 14, background: '#fff', border: '1px solid rgba(123, 29, 61, .16)', boxShadow: '0 14px 34px rgba(25, 18, 21, .16)' }}>
          <button type="button" onClick={() => location.assign(toast.href)} aria-label="Ouvrir" style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: '#f7eef1', color: '#7b1d3d', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><BellRing size={18}/></button>
          <button type="button" onClick={() => location.assign(toast.href)} style={{ border: 0, background: 'transparent', textAlign: 'left', padding: 0, cursor: 'pointer', color: '#24191d' }}><strong style={{ display: 'block', fontSize: 14 }}>{toast.title}</strong><span style={{ display: 'block', marginTop: 3, fontSize: 12, lineHeight: 1.4, color: '#6f6267' }}>{toast.detail}</span></button>
          <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Fermer" style={{ width: 28, height: 28, border: 0, background: 'transparent', color: '#8a7d82', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={16}/></button>
        </div>
      ))}
    </div>
  );
}
