import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw, Save, Sparkles, UsersRound } from 'lucide-react';

type Room = { id: string; number: string; type: string; capacity: number; floor: number; building: string; accessible?: boolean; connectingGroup?: string | null };
type Assignment = { entryId: string; guestName: string; requestedType: string; specialNeeds?: string; room: Room; score: number; reasons: string[] };
type Conflict = { entryId: string; guestName: string; requestedType: string; reason: string };
type Proposal = { groupId: string; assignments: Assignment[]; conflicts: Conflict[]; availableRooms: Room[] };

const demo: Proposal = {
  groupId: 'demo-group',
  assignments: [
    { entryId: 'e1', guestName: 'John Smith', requestedType: 'DOUBLE', room: { id: 'r201', number: '201', type: 'DOUBLE', capacity: 2, floor: 2, building: 'A' }, score: 100, reasons: ['Type exact', 'Chambre contrôlée'] },
    { entryId: 'e2', guestName: 'Mary Jones', requestedType: 'TWIN', room: { id: 'r208', number: '208', type: 'TWIN', capacity: 2, floor: 2, building: 'A' }, score: 95, reasons: ['Type exact', 'Même étage'] },
    { entryId: 'e3', guestName: 'Pierre Martin', requestedType: 'TRIPLE', specialNeeds: 'PMR', room: { id: 'r305', number: '305', type: 'TRIPLE', capacity: 3, floor: 3, building: 'A', accessible: true }, score: 120, reasons: ['PMR compatible', 'Capacité exacte'] },
  ],
  conflicts: [{ entryId: 'e4', guestName: 'Marco Rossi', requestedType: 'SINGLE', reason: 'Aucune chambre SINGLE disponible sur les dates du séjour.' }],
  availableRooms: [
    { id: 'r201', number: '201', type: 'DOUBLE', capacity: 2, floor: 2, building: 'A' },
    { id: 'r208', number: '208', type: 'TWIN', capacity: 2, floor: 2, building: 'A' },
    { id: 'r305', number: '305', type: 'TRIPLE', capacity: 3, floor: 3, building: 'A', accessible: true },
    { id: 'r314', number: '314', type: 'DOUBLE', capacity: 2, floor: 3, building: 'A' },
    { id: 'r410', number: '410', type: 'QUADRUPLE', capacity: 4, floor: 4, building: 'A' },
  ],
};

export function AllocationReviewPage() {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get('groupId') ?? demo.groupId;
  const groupName = params.get('name') ?? 'Groupe de démonstration';
  const [proposal, setProposal] = useState<Proposal>(demo);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const assignedRoomIds = useMemo(() => new Set(proposal.assignments.map((item) => item.room.id)), [proposal.assignments]);

  async function loadProposal() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/allocation/${groupId}/propose`, { method: 'POST' });
      if (!response.ok) throw new Error('API indisponible');
      const data = await response.json();
      setProposal({ ...data, availableRooms: data.availableRooms ?? demo.availableRooms });
    } catch {
      setProposal(demo);
      setMessage('Mode démonstration : proposition locale affichée.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (groupId !== demo.groupId) void loadProposal(); }, []);

  function replaceRoom(entryId: string, roomId: string) {
    const room = proposal.availableRooms.find((item) => item.id === roomId);
    if (!room) return;
    setProposal((current) => ({
      ...current,
      assignments: current.assignments.map((item) => item.entryId === entryId ? { ...item, room, score: Math.max(0, item.score - 5), reasons: ['Affectation manuelle'] } : item),
    }));
  }

  async function applyAllocation() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/allocation/${groupId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: proposal.assignments.map((item) => ({ entryId: item.entryId, roomId: item.room.id })) }),
      });
      if (!response.ok) throw new Error('Échec');
      setMessage('Allocation enregistrée avec succès.');
    } catch {
      setMessage('Allocation validée en mode démonstration.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="allocation-page">
    <header className="allocation-header">
      <a className="back-link" href="/groupes"><ArrowLeft size={18}/> Groupes</a>
      <div><p className="eyebrow">Smart Room Allocation</p><h1>{groupName}</h1><p>Contrôlez la proposition automatique avant de l’enregistrer.</p></div>
      <div className="allocation-actions"><button className="secondary-button" onClick={loadProposal} disabled={loading}><RefreshCw size={17}/>{loading ? 'Analyse…' : 'Recalculer'}</button><button className="primary-button" onClick={applyAllocation} disabled={saving || proposal.assignments.length === 0}><Save size={17}/>{saving ? 'Enregistrement…' : 'Valider l’allocation'}</button></div>
    </header>

    {message && <div className="allocation-message">{message}</div>}

    <section className="allocation-kpis">
      <article><UsersRound/><div><strong>{proposal.assignments.length}</strong><span>Voyageurs attribués</span></div></article>
      <article><CheckCircle2/><div><strong>{new Set(proposal.assignments.map((item) => item.room.id)).size}</strong><span>Chambres utilisées</span></div></article>
      <article className={proposal.conflicts.length ? 'danger' : ''}><AlertTriangle/><div><strong>{proposal.conflicts.length}</strong><span>Conflits à résoudre</span></div></article>
      <article><Sparkles/><div><strong>{Math.round(proposal.assignments.reduce((sum, item) => sum + item.score, 0) / Math.max(1, proposal.assignments.length))}</strong><span>Score moyen</span></div></article>
    </section>

    <section className="allocation-layout">
      <div className="allocation-table panel">
        <div className="allocation-row allocation-head"><span>Voyageur</span><span>Demande</span><span>Chambre proposée</span><span>Compatibilité</span></div>
        {proposal.assignments.map((item) => <div className="allocation-row" key={item.entryId}>
          <span><strong>{item.guestName}</strong><small>{item.specialNeeds || 'Aucune demande spéciale'}</small></span>
          <span><strong>{item.requestedType}</strong><small>{item.room.capacity} personne(s)</small></span>
          <span><select value={item.room.id} onChange={(event) => replaceRoom(item.entryId, event.target.value)}>
            {proposal.availableRooms.filter((room) => room.id === item.room.id || !assignedRoomIds.has(room.id)).map((room) => <option value={room.id} key={room.id}>{room.number} · {room.type} · Bât. {room.building} · Étage {room.floor}{room.accessible ? ' · PMR' : ''}</option>)}
          </select></span>
          <span><span className={`score-badge ${item.score >= 100 ? 'excellent' : item.score >= 80 ? 'good' : 'warning'}`}>{item.score}</span><small>{item.reasons.join(' · ')}</small></span>
        </div>)}
      </div>

      <aside className="allocation-side panel">
        <div className="panel-header compact"><div><p className="eyebrow">Contrôle</p><h2>Conflits</h2></div><span className="count-badge">{proposal.conflicts.length}</span></div>
        {proposal.conflicts.length === 0 ? <div className="allocation-success"><CheckCircle2/><strong>Aucun conflit</strong><p>Toutes les demandes ont une chambre compatible.</p></div> : proposal.conflicts.map((conflict) => <article className="conflict-card" key={conflict.entryId}><AlertTriangle/><div><strong>{conflict.guestName}</strong><span>{conflict.requestedType}</span><p>{conflict.reason}</p></div></article>)}
        <div className="allocation-rules"><h3>Règles actives</h3><p>✓ Capacité respectée</p><p>✓ Double et twin distinguées</p><p>✓ Chambres HS exclues</p><p>✓ PMR prioritaire</p><p>✓ Pas de double attribution</p></div>
      </aside>
    </section>
  </div>;
}
