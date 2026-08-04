import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, MessageSquareText, Pin, Plus, Search, Send, X } from 'lucide-react';

type Priority = 'info' | 'important' | 'urgent';
type Status = 'À traiter' | 'En cours' | 'Traité';

type Comment = { id: number; author: string; text: string; time: string };
type Note = {
  id: number;
  title: string;
  content: string;
  author: string;
  time: string;
  service: string;
  priority: Priority;
  status: Status;
  pinned: boolean;
  comments: Comment[];
};

const initialNotes: Note[] = [
  {
    id: 1,
    title: 'Paiement Joe Walsh en attente',
    content: 'Le virement n’est toujours pas visible. Demander une preuve de paiement avant 15h00.',
    author: 'Thomas',
    time: '09:46',
    service: 'Réception',
    priority: 'urgent',
    status: 'À traiter',
    pinned: true,
    comments: [{ id: 1, author: 'Paola', text: 'Relance envoyée à 10h05.', time: '10:05' }],
  },
  {
    id: 2,
    title: 'Arrivée du groupe ORP',
    content: 'L’arrivée est décalée à 18h30. Prévenir le restaurant et conserver le parking bus.',
    author: 'Gabriel',
    time: '08:12',
    service: 'Tous les services',
    priority: 'important',
    status: 'En cours',
    pinned: false,
    comments: [
      { id: 2, author: 'Restaurant', text: 'Dîner maintenu à 19h30.', time: '08:24' },
      { id: 3, author: 'Housekeeping', text: 'Les chambres seront prêtes à 16h00.', time: '08:31' },
    ],
  },
  {
    id: 3,
    title: 'Chambre 214 prête',
    content: 'La chambre a été nettoyée et contrôlée. Lit bébé installé.',
    author: 'Paola',
    time: '09:04',
    service: 'Réception',
    priority: 'info',
    status: 'Traité',
    pinned: false,
    comments: [],
  },
];

export function MainCourante() {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedId, setSelectedId] = useState(1);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<'all' | Priority>('all');
  const [isFormOpen, setFormOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [draft, setDraft] = useState({ title: '', content: '', service: 'Réception', priority: 'info' as Priority });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...notes]
      .filter((note) => priority === 'all' || note.priority === priority)
      .filter((note) => !query || `${note.title} ${note.content} ${note.author} ${note.service}`.toLowerCase().includes(query))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.id - a.id);
  }, [notes, priority, search]);

  const selected = notes.find((note) => note.id === selectedId) ?? filtered[0];

  function createNote() {
    if (!draft.title.trim() || !draft.content.trim()) return;
    const note: Note = {
      id: Date.now(),
      title: draft.title.trim(),
      content: draft.content.trim(),
      author: 'Thomas',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      service: draft.service,
      priority: draft.priority,
      status: 'À traiter',
      pinned: false,
      comments: [],
    };
    setNotes((current) => [note, ...current]);
    setSelectedId(note.id);
    setDraft({ title: '', content: '', service: 'Réception', priority: 'info' });
    setFormOpen(false);
  }

  function updateSelected(update: Partial<Note>) {
    if (!selected) return;
    setNotes((current) => current.map((note) => (note.id === selected.id ? { ...note, ...update } : note)));
  }

  function addComment() {
    const text = comment.trim();
    if (!selected || !text) return;
    updateSelected({
      comments: [
        ...selected.comments,
        { id: Date.now(), author: 'Thomas', text, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) },
      ],
    });
    setComment('');
  }

  return (
    <div className="shift-page">
      <header className="shift-header">
        <a className="back-link" href="/"><ArrowLeft size={18} /> Tableau de bord</a>
        <div>
          <p className="eyebrow">Communication interne</p>
          <h1>Main courante</h1>
          <p className="shift-subtitle">Toutes les transmissions de la réception, centralisées et traçables.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setFormOpen(true)}><Plus size={17} /> Nouvelle transmission</button>
      </header>

      <section className="shift-toolbar">
        <label className="search-box shift-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une transmission…" /></label>
        <div className="filter-chips">
          {(['all', 'info', 'important', 'urgent'] as const).map((item) => (
            <button className={`filter-chip${priority === item ? ' active' : ''}`} key={item} type="button" onClick={() => setPriority(item)}>
              {item === 'all' ? 'Toutes' : item === 'info' ? 'Informations' : item === 'important' ? 'Importantes' : 'Urgentes'}
            </button>
          ))}
        </div>
      </section>

      <section className="shift-layout">
        <aside className="shift-filters panel">
          <h2>Vues</h2>
          <button type="button" className="shift-view active">Aujourd’hui <span>{notes.length}</span></button>
          <button type="button" className="shift-view">Épinglées <span>{notes.filter((note) => note.pinned).length}</span></button>
          <button type="button" className="shift-view">À traiter <span>{notes.filter((note) => note.status === 'À traiter').length}</span></button>
          <button type="button" className="shift-view">Traitées <span>{notes.filter((note) => note.status === 'Traité').length}</span></button>
        </aside>

        <div className="shift-list panel">
          <div className="shift-list-heading"><h2>Transmissions</h2><span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span></div>
          {filtered.map((note) => (
            <button className={`note-card${selected?.id === note.id ? ' selected' : ''}`} type="button" key={note.id} onClick={() => setSelectedId(note.id)}>
              <div className="note-card-top">
                <span className={`priority-badge ${note.priority}`}>{note.priority}</span>
                {note.pinned && <Pin size={15} />}
                <time>{note.time}</time>
              </div>
              <strong>{note.title}</strong>
              <p>{note.content}</p>
              <div className="note-card-meta"><span>{note.author}</span><span>{note.service}</span><span><MessageSquareText size={14} /> {note.comments.length}</span></div>
            </button>
          ))}
          {filtered.length === 0 && <p className="empty-state">Aucune transmission ne correspond aux filtres.</p>}
        </div>

        <article className="shift-detail panel">
          {selected ? (
            <>
              <div className="detail-heading">
                <div><span className={`priority-badge ${selected.priority}`}>{selected.priority}</span><h2>{selected.title}</h2></div>
                <button className={`pin-button${selected.pinned ? ' active' : ''}`} type="button" onClick={() => updateSelected({ pinned: !selected.pinned })}><Pin size={18} /></button>
              </div>
              <p className="detail-content">{selected.content}</p>
              <div className="detail-meta"><span>Publié par <strong>{selected.author}</strong></span><span>{selected.time}</span><span>{selected.service}</span></div>

              <label className="field-label" htmlFor="status">Statut</label>
              <select id="status" className="status-select" value={selected.status} onChange={(event) => updateSelected({ status: event.target.value as Status })}>
                <option>À traiter</option><option>En cours</option><option>Traité</option>
              </select>

              <div className="comments-heading"><h3>Commentaires</h3><span>{selected.comments.length}</span></div>
              <div className="comment-list">
                {selected.comments.map((item) => <div className="comment" key={item.id}><div className="comment-avatar">{item.author.slice(0, 2).toUpperCase()}</div><div><strong>{item.author}</strong><time>{item.time}</time><p>{item.text}</p></div></div>)}
                {selected.comments.length === 0 && <p className="empty-state">Aucun commentaire pour le moment.</p>}
              </div>
              <div className="comment-compose"><input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addComment()} placeholder="Ajouter un commentaire…" /><button type="button" onClick={addComment}><Send size={17} /></button></div>
            </>
          ) : <p className="empty-state">Sélectionnez une transmission.</p>}
        </article>
      </section>

      {isFormOpen && (
        <div className="modal-backdrop" onMouseDown={() => setFormOpen(false)}>
          <section className="modal shift-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><p className="eyebrow">Main courante</p><h2>Nouvelle transmission</h2></div><button className="icon-button" type="button" onClick={() => setFormOpen(false)}><X size={19} /></button></div>
            <label className="field-label">Titre<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex. Arrivée tardive groupe ORP" /></label>
            <label className="field-label">Description<textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="Information à transmettre…" /></label>
            <div className="form-grid">
              <label className="field-label">Service<select value={draft.service} onChange={(event) => setDraft({ ...draft, service: event.target.value })}><option>Réception</option><option>Direction</option><option>Housekeeping</option><option>Maintenance</option><option>Restaurant</option><option>Tous les services</option></select></label>
              <label className="field-label">Priorité<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}><option value="info">Information</option><option value="important">Importante</option><option value="urgent">Urgente</option></select></label>
            </div>
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Annuler</button><button className="primary-button" type="button" onClick={createNote}><CheckCircle2 size={17} /> Publier</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
