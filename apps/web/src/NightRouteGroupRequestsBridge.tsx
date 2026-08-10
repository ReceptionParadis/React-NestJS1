import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, UsersRound } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type GroupWakeup = {
  id: string;
  groupId: string;
  groupName: string;
  date: string;
  time: string;
  notes?: string;
  completedAt?: string;
  completedBy?: string;
};

function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function plusDay(value: string, n: number) {
  const d = new Date(`${value}T12:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
}

function minutes(value?: string) {
  if (!value) return 9999;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function inNight(date: string, time: string, startDate: string, endDate: string) {
  const m = minutes(time);
  return (date === startDate && m >= 1320) || (date === endDate && m <= 510);
}

function selectedNightDate() {
  const q = new URLSearchParams(window.location.search).get('date');
  return /^\d{4}-\d{2}-\d{2}$/.test(q || '') ? q! : iso(new Date());
}

export function NightRouteGroupRequestsBridge() {
  const wakeups = useOperationalStore<GroupWakeup[]>('group-wakeups', []);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [nightDate, setNightDate] = useState(selectedNightDate);

  useEffect(() => {
    if (window.location.pathname !== '/reception/feuille-route-veilleur') {
      setHost(null);
      return;
    }

    const sync = () => {
      setNightDate(selectedNightDate());
      const blocks = Array.from(document.querySelectorAll<HTMLElement>('.night-block'));
      const block = blocks.find((node) => node.querySelector('h3')?.textContent?.trim() === 'Demandes clients individuels' || node.querySelector('h3')?.textContent?.trim() === 'Demandes clients & groupes');
      if (!block) return;

      const title = block.querySelector('h3');
      const subtitle = block.querySelector('header span');
      if (title) title.textContent = 'Demandes clients & groupes';
      if (subtitle) subtitle.textContent = 'Demandes individuelles, demandes groupes et réveils prévus pendant la nuit';

      let mount = block.querySelector<HTMLElement>('[data-night-group-requests]');
      if (!mount) {
        mount = document.createElement('div');
        mount.dataset.nightGroupRequests = 'true';
        block.appendChild(mount);
      }
      setHost(mount);
    };

    sync();
    const timer = window.setInterval(sync, 500);
    window.addEventListener('popstate', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const endDate = plusDay(nightDate, 1);
  const groupWakeups = useMemo(
    () => wakeups.data
      .filter((w) => !w.completedAt && inNight(w.date, w.time, nightDate, endDate))
      .sort((a, b) => {
        const da = a.date === nightDate ? 0 : 1;
        const db = b.date === nightDate ? 0 : 1;
        return da - db || minutes(a.time) - minutes(b.time);
      }),
    [wakeups.data, nightDate, endDate],
  );

  useEffect(() => {
    if (!host) return;
    const block = host.closest('.night-block');
    const empty = block?.querySelector<HTMLElement>('.night-empty');
    if (empty) {
      if (groupWakeups.length > 0 && empty.textContent?.includes('Aucune demande individuelle')) {
        empty.style.display = 'none';
      } else {
        empty.style.removeProperty('display');
      }
    }
  }, [host, groupWakeups.length]);

  if (!host || window.location.pathname !== '/reception/feuille-route-veilleur') return null;

  return createPortal(
    groupWakeups.length > 0 ? (
      <div className="night-request-list" style={{ marginTop: 8 }}>
        {groupWakeups.map((wakeup) => (
          <article key={wakeup.id}>
            <BellRing size={18} />
            <time>{wakeup.time}</time>
            <div>
              <strong>Réveil groupe · {wakeup.groupName || 'Groupe'}</strong>
              <span><UsersRound size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />Demande groupe</span>
              {wakeup.notes && <small>{wakeup.notes}</small>}
            </div>
            <b>À effectuer</b>
          </article>
        ))}
      </div>
    ) : null,
    host,
  );
}
