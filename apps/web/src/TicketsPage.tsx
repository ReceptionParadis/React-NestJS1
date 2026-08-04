import { useMemo, useState } from 'react';
import { ArrowLeft, Clock3, Filter, MapPin, Plus, Search, Send, UserRound, X } from 'lucide-react';

type TicketStatus = 'Nouveau' | 'Assigné' | 'En cours' | 'En attente' | 'Résolu';
type TicketPriority = 'Basse' | 'Normale' | 'Haute' | 'Critique';

type TicketComment = { id: number; author: string; text: string; time: string };
type Ticket = {
  id: number;
  reference: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  service: string;
  location: string;
  room?: string;
  assignee: string;
  requester: string;
  createdAt: string;
  due: string;
  comments: TicketComment[];
};

const statuses: TicketStatus[] = ['Nouveau', 'Assigné', 'En cours', 'En attente', 'Résolu'];

const initialTickets: Ticket[] = [
  {
    id: 1,
    reference: 'HC-2026-000154',
    title: 'Climatisation en panne',
    description: 'La climatisation ne produit plus d’air froid. Chambre occupée par le groupe Tangney.',
    status: 'En cours',
    priority: 'Critique',
    service: 'Maintenance',
    location: 'Bâtiment A · 4e étage',
    room: '412',
    assignee: 'José',
    requester: 'Thomas',
    createdAt: '09h12',
    due: 'Échéance 10h00',
    comments: [{ id: 1, author: 'José', text: 'Diagnostic en cours, filtre vérifié.', time: '09h38' }],
  },
  {
    id: 2,
    reference: 'HC-2026-000155',
    title: 'Porte difficile à fermer',
    description: 'La porte frotte au sol et nécessite plusieurs tentatives pour se verrouiller.',
    status: 'Assigné',
    priority: 'Haute',
    service: 'Maintenance',
    location: 'Bâtiment A · 2e étage',
    room: '215',
    assignee: 'Maintenance',
    requester: 'Paola',
    createdAt: '09h25',
    due: 'Avant 14h00',
    comments: [],
  },
  {
    id: 3,
    reference: 'HC-2026-000156',
    title: 'Télévision sans signal',
    description: 'Écran allumé mais aucune chaîne disponible après redémarrage.',
    status: 'Nouveau',
    priority: 'Normale',
    service: 'IT',
    location: 'Bâtiment B · 6e étage',
    room: '608',
    assignee: 'Non assigné',
    requester: 'Gabriel',
    createdAt: '10h04',
    due: 'Aujourd’hui',
    comments: [],
  },
  {
    id: 4,
    reference: 'HC-2026-000151',
    title: 'Lit bébé installé',
    description: 'Lit bébé installé et contrôlé avant arrivée client.',
    status: 'Résolu',
    priority: 'Basse',
    service: 'Housekeeping',
    location: 'Bâtiment A · 2e étage',
    room: '214',
    assignee: 'Valérie',
    requester: 'Réception',
    createdAt: '08h12',
    due: 'Terminé 09h02',
    comments: [{ id: 2, author: 'Valérie', text: 'Installation terminée.', time: '09h02' }],
  },
  {
    id: 5,
    reference: 'HC-2026-000153',
    title: 'Badge parking bus manquant',
    description: 'Préparer un badge supplémentaire pour le groupe ORP.',
    status: 'En attente',
    priority: 'Haute',
    service: 'Réception',
    location: 'Parking bus',
    assignee: 'Gabriel',
    requester: 'Thomas',
    createdAt: '08h55',
    due: 'Avant 17h30',
    comments: [],
  },
];

const priorityClass: Record<TicketPriority, string> = {
  Basse: 'low',
  Normale: 'normal',
  Haute: 'high',
  Critique: 'critical',
};

export function TicketsPage() {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState(1);
  const [search, setSearch] = useState('');
  const [service, setService] = useState('Tous');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [draft, setDraft] = useState({ title: '', description: '', room: '', service: 'Maintenance', priority: 'Normale' as TicketPriority });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesSearch = !query || `${ticket.reference} ${ticket.title} ${ticket.description} ${ticket.room ?? ''} ${ticket.assignee}`.toLowerCase().includes(query);
      const matchesService = service === 'Tous' || ticket.service === service;
      return matchesSearch && matchesService;
    });
  }, [search, service, tickets]);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? filtered[0];

  function updateTicket(id: number, update: Partial<Ticket>) {
    setTickets((current) => current.map((ticket) => (ticket.id === id ? { ...ticket, ...update } : ticket)));
  }

  function addComment() {
    const text = comment.trim();
    if (!selected || !text) return;
    updateTicket(selected.id, {
      comments: [...selected.comments, { id: Date.now(), author: 'Thomas', text, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }],
    });
    setComment('');
  }

  function createTicket() {
    if (!draft.title.trim() || !draft.description.trim()) return;
    const id = Date.now();
    const ticket: Ticket = {
      id,
      reference: `HC-2026-${String(tickets.length + 157).padStart(6, '0')}`,
      title: draft.title.trim(),
      description: draft.description.trim(),
      status: 'Nouveau',
      priority: draft.priority,
      service: draft.service,
      location: draft.room ? `Chambre ${draft.room}` : 'Zone non précisée',
      room: draft.room || undefined,
      assignee: 'Non assigné',
      requester: 'Thomas',
      createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      due: 'À planifier',
      comments: [],
    };
    setTickets((current) => [ticket, ...current]);
    setSelectedId(id);
    setDraft({ title: '', description: '', room: '', service: 'Maintenance', priority: 'Normale' });
    setCreateOpen(false);
  }

  return (
    <div className="tickets-page">
      <header className="tickets-header">
        <div>
          <a className="back-link" href="/"><ArrowLeft size={18} /> Tableau de bord</a>
          <p className="eyebrow">Suivi opérationnel</p>
          <h1>Tickets</h1>
          <p className="tickets-subtitle">Aucune demande ne doit être oubliée.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setCreateOpen(true)}><Plus size={17} /> Nouveau ticket</button>
      </header>

      <section className="tickets-toolbar">
        <label className="tickets-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un ticket, une chambre…" /></label>
        <label className="tickets-service"><Filter size={17} /><select value={service} onChange={(event) => setService(event.target.value)}><option>Tous</option><option>Maintenance</option><option>Réception</option><option>Housekeeping</option><option>IT</option></select></label>
        <div className="ticket-kpis"><span><strong>{tickets.filter((ticket) => ticket.priority === 'Critique' && ticket.status !== 'Résolu').length}</strong> critiques</span><span><strong>{tickets.filter((ticket) => ticket.status === 'Résolu').length}</strong> résolus</span><span><strong>{tickets.filter((ticket) => ticket.status !== 'Résolu').length}</strong> ouverts</span></div>
      </section>

      <section className="ticket-workspace">
        <div className="ticket-board">
          {statuses.map((status) => {
            const columnTickets = filtered.filter((ticket) => ticket.status === status);
            return (
              <section className="ticket-column" key={status}>
                <div className="ticket-column-header"><h2>{status}</h2><span>{columnTickets.length}</span></div>
                <div className="ticket-stack">
                  {columnTickets.map((ticket) => (
                    <button className={`ticket-card${selected?.id === ticket.id ? ' selected' : ''}`} type="button" key={ticket.id} onClick={() => setSelectedId(ticket.id)}>
                      <div className="ticket-card-top"><span className={`ticket-priority ${priorityClass[ticket.priority]}`}>{ticket.priority}</span><small>{ticket.reference}</small></div>
                      <strong>{ticket.title}</strong>
                      <p>{ticket.description}</p>
                      <div className="ticket-card-meta">{ticket.room && <span><MapPin size={14} /> Ch. {ticket.room}</span>}<span><UserRound size={14} /> {ticket.assignee}</span></div>
                      <div className="ticket-due"><Clock3 size={14} /> {ticket.due}</div>
                    </button>
                  ))}
                  {columnTickets.length === 0 && <p className="ticket-empty">Aucun ticket</p>}
                </div>
              </section>
            );
          })}
        </div>

        {selected && (
          <aside className="ticket-detail">
            <div className="ticket-detail-head"><div><span className={`ticket-priority ${priorityClass[selected.priority]}`}>{selected.priority}</span><small>{selected.reference}</small><h2>{selected.title}</h2></div><button className="detail-close" type="button" onClick={() => setSelectedId(0)}><X size={18} /></button></div>
            <p className="ticket-description">{selected.description}</p>
            <div className="ticket-properties"><div><span>Localisation</span><strong>{selected.location}{selected.room ? ` · Chambre ${selected.room}` : ''}</strong></div><div><span>Service</span><strong>{selected.service}</strong></div><div><span>Demandeur</span><strong>{selected.requester}</strong></div><div><span>Responsable</span><strong>{selected.assignee}</strong></div></div>
            <label className="field-label">Statut<select value={selected.status} onChange={(event) => updateTicket(selected.id, { status: event.target.value as TicketStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="field-label">Responsable<select value={selected.assignee} onChange={(event) => updateTicket(selected.id, { assignee: event.target.value })}><option>Non assigné</option><option>Maintenance</option><option>José</option><option>Gabriel</option><option>Valérie</option><option>Thomas</option></select></label>
            <div className="ticket-comments-title"><h3>Historique et commentaires</h3><span>{selected.comments.length}</span></div>
            <div className="ticket-comments">{selected.comments.map((item) => <div className="ticket-comment" key={item.id}><div className="comment-avatar">{item.author.slice(0, 2).toUpperCase()}</div><div><strong>{item.author}</strong><time>{item.time}</time><p>{item.text}</p></div></div>)}{selected.comments.length === 0 && <p className="ticket-empty">Aucun commentaire.</p>}</div>
            <div className="ticket-comment-compose"><input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addComment()} placeholder="Ajouter un commentaire…" /><button type="button" onClick={addComment}><Send size={17} /></button></div>
          </aside>
        )}
      </section>

      {isCreateOpen && (
        <div className="modal-backdrop" onMouseDown={() => setCreateOpen(false)}>
          <section className="modal ticket-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><p className="eyebrow">Intervention</p><h2>Nouveau ticket</h2></div><button className="icon-button" type="button" onClick={() => setCreateOpen(false)}><X size={19} /></button></div>
            <label className="field-label">Titre<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex. Climatisation en panne" /></label>
            <label className="field-label">Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Décrivez précisément le problème…" /></label>
            <div className="ticket-form-grid"><label className="field-label">Chambre ou zone<input value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} placeholder="412" /></label><label className="field-label">Service<select value={draft.service} onChange={(event) => setDraft({ ...draft, service: event.target.value })}><option>Maintenance</option><option>Réception</option><option>Housekeeping</option><option>IT</option></select></label><label className="field-label">Priorité<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as TicketPriority })}><option>Basse</option><option>Normale</option><option>Haute</option><option>Critique</option></select></label></div>
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setCreateOpen(false)}>Annuler</button><button className="primary-button" type="button" onClick={createTicket}>Créer le ticket</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
