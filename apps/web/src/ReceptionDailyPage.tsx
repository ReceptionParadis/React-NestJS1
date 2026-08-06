import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DailyGroupBoard } from './DailyGroupBoard';
import { useOperationalStore } from './useOperationalStore';

type StayoverException = {
  room: string;
  reason: 'Refus service' | 'Ne pas déranger';
};

type Group = {
  id: string;
  name?: string;
  arrival?: string;
  departure?: string;
  arrivalTime?: string;
  rooms?: number;
  housekeepingArrivalStatus?: string;
  stayoverStatus?: string;
  stayoverExceptions?: StayoverException[];
};

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function ReceptionDailyPage() {
  const groupsStore = useOperationalStore<Group[]>('group-360', []);
  const today = todayIso();

  const readyGroups = groupsStore.data
    .filter((group) => group.arrival === today && group.housekeepingArrivalStatus === 'Chambres prêtes à donner')
    .sort((a, b) => (a.arrivalTime || '99:99').localeCompare(b.arrivalTime || '99:99'));

  const stayoverGroups = groupsStore.data
    .filter((group) =>
      String(group.arrival) < today &&
      String(group.departure) > today &&
      ['Recouche OK', 'Recouche partielle'].includes(group.stayoverStatus || ''),
    )
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));

  return (
    <div className="reception-daily-page">
      <header className="reception-daily-header">
        <a href="/"><ArrowLeft size={18} /> Dashboard</a>
        <p>HospiCore · Réception</p>
        <h1>Pilotage quotidien des groupes</h1>
        <span>Arrivées, départs, horaires, réveils, salles et suivi Housekeeping.</span>
      </header>

      {groupsStore.state === 'error' && (
        <div className="daily-closed">Synchronisation indisponible : {groupsStore.message}</div>
      )}

      {readyGroups.length > 0 && (
        <section className="reception-hk-panel reception-hk-ready">
          <header>
            <CheckCircle2 size={21} />
            <strong>Chambres prêtes à donner</strong>
            <b>{readyGroups.length}</b>
          </header>
          <div className="reception-hk-grid">
            {readyGroups.map((group) => (
              <article className="reception-hk-card" key={group.id}>
                <div>
                  <strong>{group.name || 'Groupe sans nom'}</strong>
                  <span>{group.rooms || 0} chambre(s) · arrivée {group.arrivalTime || 'à confirmer'}</span>
                </div>
                <em className="reception-hk-badge ready">Prêtes</em>
              </article>
            ))}
          </div>
        </section>
      )}

      {stayoverGroups.length > 0 && (
        <section className="reception-hk-panel">
          <header>
            <CheckCircle2 size={21} />
            <strong>Suivi des recouches</strong>
            <b>{stayoverGroups.length}</b>
          </header>
          <div className="reception-hk-grid">
            {stayoverGroups.map((group) => {
              const partial = group.stayoverStatus === 'Recouche partielle';
              return (
                <article className={`reception-hk-card${partial ? ' partial' : ''}`} key={group.id}>
                  <div className="reception-hk-card-head">
                    {partial ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}
                    <div>
                      <strong>{group.name || 'Groupe sans nom'}</strong>
                      <span>{group.rooms || 0} chambre(s)</span>
                    </div>
                    <em className={`reception-hk-badge${partial ? ' partial' : ' ready'}`}>
                      {partial ? 'Recouche partielle' : 'Recouche OK'}
                    </em>
                  </div>

                  {partial && (
                    <div className="reception-hk-exceptions">
                      <strong>Chambres non faites</strong>
                      {(group.stayoverExceptions || []).length > 0 ? (
                        (group.stayoverExceptions || []).map((item) => (
                          <div key={`${item.room}-${item.reason}`}>
                            <b>Chambre {item.room}</b>
                            <span>{item.reason}</span>
                          </div>
                        ))
                      ) : (
                        <span>Aucune chambre renseignée.</span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <DailyGroupBoard />
    </div>
  );
}
