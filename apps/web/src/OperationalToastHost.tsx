import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, CheckCheck, X } from 'lucide-react';
import type { OperationalChangeDetail } from './useOperationalStore';

type Toast = {
  id: string;
  title: string;
  detail: string;
  href: string;
  namespace: string;
  at: number;
  read: boolean;
};

type SessionUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  role?: string | { name?: string };
};

const labels: Record<string, { title: string; detail: string; href: string }> = {
  'group-360': { title: 'Groupes mis à jour', detail: 'Une fiche groupe a été modifiée depuis un autre poste.', href: '/reception' },
  'function-sheets': { title: 'Fiche de fonction mise à jour', detail: 'Les données commerciales ou la diffusion ont changé.', href: '/commercial' },
  'meeting-rooms': { title: 'Salles de réunion mises à jour', detail: 'Une réservation ou un horaire a changé.', href: '/salles-reunion' },
  'maintenance-interventions': { title: 'Maintenance mise à jour', detail: 'Une intervention a été créée ou modifiée.', href: '/tickets' },
  tasks: { title: 'Tâches mises à jour', detail: 'La liste des tâches opérationnelles a changé.', href: '/taches' },
  'general-instructions': { title: 'Consignes mises à jour', detail: 'Une consigne opérationnelle a été modifiée.', href: '/consignes-generales' },
  'operations-center': { title: 'Centre des opérations mis à jour', detail: 'Un prêt ou un équipement a changé.', href: '/centre-operations' },
};

const roleNamespaces: Record<string, string[]> = {
  reception: ['group-360', 'function-sheets', 'meeting-rooms', 'maintenance-interventions', 'tasks', 'general-instructions', 'operations-center'],
  commercial: ['group-360', 'function-sheets', 'meeting-rooms', 'tasks', 'general-instructions'],
  maintenance: ['maintenance-interventions', 'tasks', 'general-instructions'],
};

function currentUser(): SessionUser {
  try {
    return JSON.parse(localStorage.getItem('hospicore.session') || '{}')?.user || {};
  } catch {
    return {};
  }
}

function normalizedRole(user: SessionUser) {
  const raw = String(typeof user.role === 'object' ? user.role?.name || '' : user.role || '').toLowerCase();
  if (raw.includes('direction') || raw.includes('directeur') || raw.includes('admin')) return 'direction';
  if (raw.includes('maintenance') || raw.includes('tech')) return 'maintenance';
  if (raw.includes('commercial')) return 'commercial';
  if (raw.includes('réception') || raw.includes('reception') || raw.includes('front')) return 'reception';
  return 'direction';
}

function notificationKey(user: SessionUser) {
  const identity = user.id || `${user.firstName || 'user'}-${user.lastName || ''}`;
  return `hospicore.notifications.v2.${identity}`;
}

function loadNotifications(key: string): Toast[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
}

export function OperationalToastHost() {
  const user = useMemo(() => currentUser(), []);
  const role = useMemo(() => normalizedRole(user), [user]);
  const storageKey = useMemo(() => notificationKey(user), [user]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [history, setHistory] = useState<Toast[]>(() => loadNotifications(storageKey));
  const [open, setOpen] = useState(false);
  const timers = useRef<number[]>([]);

  const canReceive = (namespace: string) => role === 'direction' || (roleNamespaces[role] || []).includes(namespace);

  const persist = (items: Toast[]) => {
    const next = items.slice(0, 30);
    setHistory(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const markRead = (id: string) => {
    persist(history.map((item) => item.id === id ? { ...item, read: true } : item));
  };

  const openNotification = (item: Toast) => {
    markRead(item.id);
    location.assign(item.href);
  };

  const markAllRead = () => persist(history.map((item) => ({ ...item, read: true })));
  const unread = history.filter((item) => !item.read).length;

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<OperationalChangeDetail>).detail;
      if (!detail || detail.source !== 'remote' || !canReceive(detail.namespace)) return;

      const meta = labels[detail.namespace] || {
        title: 'HospiCore mis à jour',
        detail: 'De nouvelles données viennent d’être synchronisées.',
        href: '/',
      };
      const id = `${detail.namespace}-${detail.version}-${detail.at}`;
      const notification: Toast = { id, ...meta, namespace: detail.namespace, at: detail.at, read: false };

      setToasts((current) => [notification, ...current.filter((item) => item.id !== id)].slice(0, 3));
      setHistory((current) => {
        const next = [notification, ...current.filter((item) => item.id !== id)].slice(0, 30);
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });

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
  }, [role, storageKey]);

  return (
    <>
      <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 9999, display: 'grid', gap: 10, width: 'min(380px, calc(100vw - 36px))', pointerEvents: 'none' }}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto', display: 'grid', gridTemplateColumns: '34px 1fr 28px', gap: 10, alignItems: 'start', padding: '14px', borderRadius: 14, background: '#fff', border: '1px solid rgba(123, 29, 61, .16)', boxShadow: '0 14px 34px rgba(25, 18, 21, .16)' }}>
            <button type="button" onClick={() => openNotification(toast)} aria-label="Ouvrir" style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: '#f7eef1', color: '#7b1d3d', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><BellRing size={18}/></button>
            <button type="button" onClick={() => openNotification(toast)} style={{ border: 0, background: 'transparent', textAlign: 'left', padding: 0, cursor: 'pointer', color: '#24191d' }}><strong style={{ display: 'block', fontSize: 14 }}>{toast.title}</strong><span style={{ display: 'block', marginTop: 3, fontSize: 12, lineHeight: 1.4, color: '#6f6267' }}>{toast.detail}</span></button>
            <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Fermer" style={{ width: 28, height: 28, border: 0, background: 'transparent', color: '#8a7d82', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={16}/></button>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Notifications" style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 9998, width: 48, height: 48, borderRadius: 16, border: '1px solid rgba(123,29,61,.18)', background: '#fff', color: '#7b1d3d', boxShadow: '0 12px 30px rgba(25,18,21,.16)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
        <Bell size={20}/>
        {unread > 0 && <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 22, height: 22, padding: '0 5px', borderRadius: 11, background: '#b42318', color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid #fff' }}>{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && <aside style={{ position: 'fixed', right: 22, bottom: 80, zIndex: 9998, width: 'min(390px, calc(100vw - 32px))', maxHeight: 'min(600px, calc(100vh - 120px))', overflow: 'hidden', borderRadius: 18, background: '#fff', border: '1px solid rgba(123,29,61,.14)', boxShadow: '0 18px 45px rgba(25,18,21,.2)', display: 'grid', gridTemplateRows: 'auto 1fr' }}>
        <header style={{ padding: '14px 16px', borderBottom: '1px solid #eee5e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div><strong style={{ display: 'block', fontSize: 15 }}>Notifications</strong><span style={{ fontSize: 11, color: '#7d7075' }}>{unread} non lue(s) · profil {role}</span></div>
          <button type="button" onClick={markAllRead} disabled={!unread} title="Tout marquer comme lu" style={{ border: 0, background: 'transparent', color: unread ? '#7b1d3d' : '#b7adb0', cursor: unread ? 'pointer' : 'default', display: 'grid', placeItems: 'center' }}><CheckCheck size={19}/></button>
        </header>
        <div style={{ overflowY: 'auto', padding: 8 }}>
          {!history.length && <p style={{ margin: 0, padding: 20, textAlign: 'center', color: '#807479', fontSize: 13 }}>Aucune notification récente.</p>}
          {history.map((item) => <button key={item.id} type="button" onClick={() => openNotification(item)} style={{ width: '100%', border: 0, borderRadius: 12, padding: '11px 12px', marginBottom: 4, background: item.read ? 'transparent' : '#faf2f5', display: 'grid', gridTemplateColumns: '10px 1fr', gap: 9, textAlign: 'left', cursor: 'pointer', color: '#24191d' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, background: item.read ? '#d7cfd2' : '#7b1d3d' }}/>
            <span><strong style={{ display: 'block', fontSize: 13 }}>{item.title}</strong><small style={{ display: 'block', marginTop: 2, color: '#766a6f', lineHeight: 1.35 }}>{item.detail}</small><time style={{ display: 'block', marginTop: 5, fontSize: 10, color: '#9a8f93' }}>{new Date(item.at).toLocaleString('fr-FR')}</time></span>
          </button>)}
        </div>
      </aside>}
    </>
  );
}
