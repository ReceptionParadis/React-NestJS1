import { ArrowLeft } from 'lucide-react';
import { RoomingListImport } from './RoomingListImport';

export function RoomingListImportPage() {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get('groupId') ?? 'demo-group';
  const groupName = params.get('name') ?? 'Groupe sélectionné';

  return <main className="rooming-page">
    <header className="module-header">
      <a className="back-link" href="/groupes"><ArrowLeft size={18}/> Retour aux groupes</a>
      <div><p className="eyebrow">Rooming list</p><h1>{groupName}</h1><p>Contrôlez les colonnes et les voyageurs avant l’enregistrement dans HospiCore.</p></div>
    </header>
    <section className="rooming-guide panel">
      <h2>Colonnes reconnues automatiquement</h2>
      <p>Nom, prénom, sexe, date de naissance, type de chambre, numéro de chambre et observations.</p>
      <p>Les intitulés français et anglais sont acceptés. Un type non reconnu est provisoirement interprété comme <strong>TWIN</strong>.</p>
    </section>
    <RoomingListImport groupId={groupId} />
  </main>;
}
