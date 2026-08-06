import { ArrowLeft, CalendarDays, ChevronRight, ClipboardCheck, UsersRound } from 'lucide-react';

const items = [
  {
    title: 'Fiches Groupe 360°',
    description: 'Créer, compléter et valider les dossiers groupes, les prestations, les repas et les informations financières.',
    href: '/commercial/groupes',
    icon: UsersRound,
  },
  {
    title: 'Fiche de fonction hebdomadaire',
    description: 'Importer les groupes validés, relire chaque ligne, valider l’impression et diffuser la fiche aux services.',
    href: '/commercial/planning-hebdomadaire',
    icon: CalendarDays,
  },
];

export function CommercialHubPage() {
  return <main className="commercial-hub">
    <header className="commercial-hub-header">
      <button onClick={() => { window.location.href = '/'; }}><ArrowLeft size={18}/>Tableau de bord</button>
      <p>HospiCore · Espace Commercial</p>
      <h1><ClipboardCheck size={32}/>Pilotage des groupes</h1>
      <span>Préparez les dossiers groupes et publiez les fiches de fonction destinées aux services.</span>
    </header>

    <section className="commercial-hub-grid">
      {items.map(({ title, description, href, icon: Icon }) => <button key={href} onClick={() => { window.location.href = href; }}>
        <span className="commercial-hub-icon"><Icon size={30}/></span>
        <div><h2>{title}</h2><p>{description}</p><strong>Ouvrir le module <ChevronRight size={17}/></strong></div>
      </button>)}
    </section>
  </main>;
}
