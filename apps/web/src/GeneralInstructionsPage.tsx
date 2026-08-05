import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Plus, Search, UserRound, X } from 'lucide-react';

type Priority = 'Normale' | 'Haute' | 'Critique';
type Status = 'À faire' | 'En cours' | 'Terminée';
type Category = 'Bagagerie' | 'Colis' | 'Taxi' | 'VIP' | 'Incident' | 'Demande spéciale';
type History = { id:string; action:string; actor:string; role:string; at:string };
type Instruction = {
  id:string; reference:string; category:Category; title:string; clientName:string; room:string; phone:string;
  service:string; priority:Priority; status:Status; startAt:string; dueAt:string; details:string; history:History[];
};

const KEY='hospicore.operations.instructions.v1';
const demo:Instruction[]=[{
  id:'c1',reference:'CS-2026-000041',category:'Colis',title:'Colis à remettre au client',clientName:'Mme Rossi',room:'418',phone:'',service:'Réception',priority:'Haute',status:'À faire',startAt:'2026-08-05T17:30',dueAt:'2026-08-05T21:00',details:'Colis conservé dans le bureau de la réception A.',history:[{id:'h1',action:'Consigne créée',actor:'Thomas PETRISSANS',role:'Directeur Hébergement',at:'05/08/2026 17:30:12'}]
}];

function user(){try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}');const u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:u.role||'Collaborateur'};}catch{return{name:'Utilisateur HospiCore',role:'Collaborateur'};}}
function stamp(){return new Date().toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function load():Instruction[]{try{return JSON.parse(localStorage.getItem(KEY)||'null')||demo;}catch{return demo;}}
function save(items:Instruction[]){localStorage.setItem(KEY,JSON.stringify(items));}

export function GeneralInstructionsPage(){
  const [items,setItems]=useState<Instruction[]>(load); const [open,setOpen]=useState(false); const [query,setQuery]=useState('');
  const filtered=useMemo(()=>items.filter(i=>`${i.reference} ${i.category} ${i.title} ${i.clientName} ${i.room} ${i.service}`.toLowerCase().includes(query.toLowerCase())),[items,query]);
  const overdue=items.filter(i=>i.status!=='Terminée'&&new Date(i.dueAt)<new Date()).length;
  function create(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const u=user();const v:Instruction={id:crypto.randomUUID(),reference:`CS-${new Date().getFullYear()}-${String(items.length+42).padStart(6,'0')}`,category:String(f.get('category')) as Category,title:String(f.get('title')||''),clientName:String(f.get('clientName')||''),room:String(f.get('room')||''),phone:String(f.get('phone')||''),service:String(f.get('service')||''),priority:String(f.get('priority')) as Priority,status:'À faire',startAt:String(f.get('startAt')||''),dueAt:String(f.get('dueAt')||''),details:String(f.get('details')||''),history:[{id:crypto.randomUUID(),action:'Consigne créée',actor:u.name,role:u.role,at:stamp()}]};const n=[v,...items];save(n);setItems(n);setOpen(false);}
  function advance(id:string){const u=user();const n=items.map(i=>{if(i.id!==id)return i;const status:Status=i.status==='À faire'?'En cours':'Terminée';return{...i,status,history:[...i.history,{id:crypto.randomUUID(),action:status==='En cours'?'Consigne prise en charge':'Consigne terminée et clôturée',actor:u.name,role:u.role,at:stamp()}]};});save(n);setItems(n);}
  return <div className="instructions-page"><header><div><button onClick={()=>location.href='/centre-operations'}><ArrowLeft size={18}/>Centre des opérations</button><p>HospiCore · Cahier de consignes</p><h1>Consignes générales</h1><span>Bagagerie, colis, taxis, VIP, incidents et demandes spéciales.</span></div><button className="instructions-primary" onClick={()=>setOpen(true)}><Plus size={18}/>Nouvelle consigne</button></header>
    <section className="instructions-kpis"><article><Clock3/><span>À faire</span><strong>{items.filter(i=>i.status==='À faire').length}</strong></article><article><AlertTriangle/><span>En retard</span><strong>{overdue}</strong></article><article><CheckCircle2/><span>Terminées</span><strong>{items.filter(i=>i.status==='Terminée').length}</strong></article></section>
    <label className="instructions-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une consigne…"/></label>
    <section className="instructions-list">{filtered.map(i=><article key={i.id}><div className="instructions-title"><div><span className={`instruction-priority ${i.priority.toLowerCase()}`}>{i.priority}</span><h2>{i.title}</h2><small>{i.reference} · {i.category} · {i.service}</small></div><span className="instruction-status">{i.status}</span></div><div className="instructions-grid"><div><span>Client</span><strong><UserRound size={15}/>{i.clientName||'Non renseigné'}</strong><small>{i.room?`Chambre ${i.room}`:'Sans chambre'}</small></div><div><span>Début</span><strong>{i.startAt.replace('T',' ')}</strong></div><div><span>Échéance</span><strong>{i.dueAt.replace('T',' ')}</strong></div></div><p>{i.details}</p><div className="instructions-history">{i.history.map(h=><div key={h.id}><span>{h.at}</span><strong>{h.action}</strong><small>{h.actor} · {h.role}</small></div>)}</div>{i.status!=='Terminée'&&<button className="instructions-secondary" onClick={()=>advance(i.id)}>{i.status==='À faire'?'Prendre en charge':'Clôturer la consigne'}</button>}</article>)}</section>
    {open&&<div className="instructions-modal"><form onSubmit={create}><header><div><p>Nouvelle entrée</p><h2>Créer une consigne</h2></div><button type="button" onClick={()=>setOpen(false)}><X/></button></header><div className="instructions-form"><label>Catégorie<select name="category"><option>Bagagerie</option><option>Colis</option><option>Taxi</option><option>VIP</option><option>Incident</option><option>Demande spéciale</option></select></label><label>Priorité<select name="priority"><option>Normale</option><option>Haute</option><option>Critique</option></select></label><label className="wide">Objet<input name="title" required/></label><label>Client<input name="clientName"/></label><label>Chambre<input name="room"/></label><label>Téléphone<input name="phone"/></label><label>Service responsable<select name="service"><option>Réception</option><option>Housekeeping</option><option>Restaurant</option><option>Cuisine</option><option>Maintenance</option><option>Commercial</option><option>Direction</option></select></label><label>Début<input type="datetime-local" name="startAt" required/></label><label>Échéance<input type="datetime-local" name="dueAt" required/></label><label className="wide">Détails<textarea name="details" required/></label></div><footer><button type="button" onClick={()=>setOpen(false)}>Annuler</button><button className="instructions-primary" type="submit">Créer et signer</button></footer></form></div>}
  </div>;
}
