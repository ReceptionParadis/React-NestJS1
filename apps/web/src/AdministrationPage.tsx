import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, Plus, Settings, ShieldCheck, Tag, UserCog, Users, X } from 'lucide-react';

type UserStatus = 'Actif' | 'Suspendu';
type AdminUser = { id:string; firstName:string; lastName:string; email:string; role:string; department:string; extension:string; status:UserStatus; updatedAt:string; updatedBy:string };
type MeetingRoom = { id:string; name:string; capacity:number; location:string; active:boolean };
type Category = { id:string; label:string; department:string; active:boolean };

type Tab = 'utilisateurs' | 'services' | 'salles' | 'categories';
const USERS_KEY='hospicore.admin.users.v1';
const ROOMS_KEY='hospicore.admin.rooms.v1';
const CATEGORIES_KEY='hospicore.admin.categories.v1';
const SERVICES=['Direction','Réception','Commercial','Maintenance'];
const ROLES=['Administrateur','Directeur Général','Directeur Hébergement','Chef de Réception','Réceptionniste','Commercial','Technicien'];
const LEGACY_SERVICES=new Set(['Housekeeping','Restaurant','Cuisine']);
const LEGACY_ROLES=new Set(['Gouvernante','Chef de Cuisine','Responsable Restaurant']);

const demoUsers:AdminUser[]=[
 {id:'u1',firstName:'Thomas',lastName:'PETRISSANS',email:'thomas@hotel-paradis-lourdes.com',role:'Directeur Hébergement',department:'Direction',extension:'4011',status:'Actif',updatedAt:'05/08/2026 23:10:00',updatedBy:'Thomas PETRISSANS'},
];
const demoRooms:MeetingRoom[]=[{id:'r1',name:'Salle Gavarnie',capacity:180,location:'Rez-de-chaussée',active:true},{id:'r2',name:'Salle Pic du Midi',capacity:80,location:'1er étage',active:true},{id:'r3',name:'Salle Béout',capacity:40,location:'Rez-de-chaussée',active:true}];
const demoCategories:Category[]=[{id:'c1',label:'Bagagerie',department:'Réception',active:true},{id:'c2',label:'Colis',department:'Réception',active:true},{id:'c3',label:'Incident client',department:'Direction',active:true},{id:'c4',label:'Demande spéciale',department:'Réception',active:true}];

function currentUser(){try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}');const u=s.user||{};return `${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim();}catch{return 'Utilisateur HospiCore';}}
function stamp(){return new Date().toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function load<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback;}catch{return fallback;}}
function save(key:string,value:unknown){localStorage.setItem(key,JSON.stringify(value));}
function cleanUsers(value:AdminUser[]){return value.filter(user=>!LEGACY_SERVICES.has(user.department)&&!LEGACY_ROLES.has(user.role));}
function cleanCategories(value:Category[]){return value.filter(category=>!LEGACY_SERVICES.has(category.department));}

export function AdministrationPage(){
 const [tab,setTab]=useState<Tab>('utilisateurs');
 const [users,setUsers]=useState<AdminUser[]>(()=>{const cleaned=cleanUsers(load(USERS_KEY,demoUsers));save(USERS_KEY,cleaned);return cleaned;});
 const [rooms,setRooms]=useState<MeetingRoom[]>(()=>load(ROOMS_KEY,demoRooms));
 const [categories,setCategories]=useState<Category[]>(()=>{const cleaned=cleanCategories(load(CATEGORIES_KEY,demoCategories));save(CATEGORIES_KEY,cleaned);return cleaned;});
 const [modal,setModal]=useState<'user'|'room'|'category'|null>(null);
 const activeUsers=useMemo(()=>users.filter(u=>u.status==='Actif').length,[users]);
 function createUser(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const value:AdminUser={id:crypto.randomUUID(),firstName:String(f.get('firstName')||''),lastName:String(f.get('lastName')||''),email:String(f.get('email')||''),role:String(f.get('role')||''),department:String(f.get('department')||''),extension:String(f.get('extension')||''),status:'Actif',updatedAt:stamp(),updatedBy:currentUser()};const next=[value,...users];setUsers(next);save(USERS_KEY,next);setModal(null);}
 function createRoom(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const value:MeetingRoom={id:crypto.randomUUID(),name:String(f.get('name')||''),capacity:Number(f.get('capacity')||0),location:String(f.get('location')||''),active:true};const next=[value,...rooms];setRooms(next);save(ROOMS_KEY,next);setModal(null);}
 function createCategory(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const value:Category={id:crypto.randomUUID(),label:String(f.get('label')||''),department:String(f.get('department')||''),active:true};const next=[value,...categories];setCategories(next);save(CATEGORIES_KEY,next);setModal(null);}
 function toggleUser(id:string){const next=users.map(u=>u.id===id?{...u,status:u.status==='Actif'?'Suspendu' as const:'Actif' as const,updatedAt:stamp(),updatedBy:currentUser()}:u);setUsers(next);save(USERS_KEY,next);}
 function toggleRoom(id:string){const next=rooms.map(r=>r.id===id?{...r,active:!r.active}:r);setRooms(next);save(ROOMS_KEY,next);}
 function toggleCategory(id:string){const next=categories.map(c=>c.id===id?{...c,active:!c.active}:c);setCategories(next);save(CATEGORIES_KEY,next);}
 return <div className="admin-page"><header className="admin-header"><div><button onClick={()=>location.href='/' }><ArrowLeft size={18}/>Tableau de bord</button><p>HospiCore · Paramétrage</p><h1>Administration</h1><span>Gérez les utilisateurs, services, salles et référentiels opérationnels.</span></div><ShieldCheck size={38}/></header>
 <section className="admin-kpis"><article><Users/><span>Utilisateurs actifs</span><strong>{activeUsers}</strong></article><article><Building2/><span>Salles actives</span><strong>{rooms.filter(r=>r.active).length}</strong></article><article><Tag/><span>Catégories actives</span><strong>{categories.filter(c=>c.active).length}</strong></article><article><Settings/><span>Services</span><strong>{SERVICES.length}</strong></article></section>
 <nav className="admin-tabs">{([['utilisateurs','Utilisateurs',UserCog],['services','Services & rôles',ShieldCheck],['salles','Salles de réunion',Building2],['categories','Catégories',Tag]] as const).map(([key,label,Icon])=><button className={tab===key?'active':''} onClick={()=>setTab(key)} key={key}><Icon size={17}/>{label}</button>)}</nav>
 {tab==='utilisateurs'&&<section className="admin-panel"><div className="admin-panel-head"><div><h2>Comptes utilisateurs</h2><p>Les actions sont signées avec le nom, le rôle et le service du collaborateur.</p></div><button onClick={()=>setModal('user')}><Plus size={17}/>Ajouter un utilisateur</button></div><div className="admin-table"><div className="admin-row head"><span>Utilisateur</span><span>Rôle</span><span>Service</span><span>Poste</span><span>Statut</span></div>{users.map(u=><div className="admin-row" key={u.id}><span><strong>{u.firstName} {u.lastName}</strong><small>{u.email}</small></span><span>{u.role}</span><span>{u.department}</span><span>{u.extension||'—'}</span><span><button className={`admin-status ${u.status.toLowerCase()}`} onClick={()=>toggleUser(u.id)}>{u.status}</button><small>{u.updatedBy} · {u.updatedAt}</small></span></div>)}</div></section>}
 {tab==='services'&&<section className="admin-panel"><div className="admin-panel-head"><div><h2>Services et rôles disponibles</h2><p>Périmètre HospiCore : Direction, Réception, Commercial et Maintenance.</p></div></div><div className="admin-reference-grid"><article><h3>Services</h3>{SERVICES.map(s=><span key={s}><CheckCircle2 size={15}/>{s}</span>)}</article><article><h3>Rôles</h3>{ROLES.map(r=><span key={r}><CheckCircle2 size={15}/>{r}</span>)}</article></div></section>}
 {tab==='salles'&&<section className="admin-panel"><div className="admin-panel-head"><div><h2>Salles de réunion</h2><p>Ces salles alimentent l’agenda partagé des salles.</p></div><button onClick={()=>setModal('room')}><Plus size={17}/>Ajouter une salle</button></div><div className="admin-card-grid">{rooms.map(r=><article key={r.id}><div><Building2/><span className={r.active?'enabled':'disabled'}>{r.active?'Active':'Désactivée'}</span></div><h3>{r.name}</h3><p>{r.capacity} personnes · {r.location}</p><button onClick={()=>toggleRoom(r.id)}>{r.active?'Désactiver':'Réactiver'}</button></article>)}</div></section>}
 {tab==='categories'&&<section className="admin-panel"><div className="admin-panel-head"><div><h2>Catégories de consignes</h2><p>Référentiel utilisé lors de la création des consignes générales.</p></div><button onClick={()=>setModal('category')}><Plus size={17}/>Ajouter une catégorie</button></div><div className="admin-card-grid">{categories.map(c=><article key={c.id}><div><Tag/><span className={c.active?'enabled':'disabled'}>{c.active?'Active':'Désactivée'}</span></div><h3>{c.label}</h3><p>Service par défaut : {c.department}</p><button onClick={()=>toggleCategory(c.id)}>{c.active?'Désactiver':'Réactiver'}</button></article>)}</div></section>}
 {modal&&<div className="admin-modal"><form onSubmit={modal==='user'?createUser:modal==='room'?createRoom:createCategory}><header><div><p>Administration</p><h2>{modal==='user'?'Nouvel utilisateur':modal==='room'?'Nouvelle salle':'Nouvelle catégorie'}</h2></div><button type="button" onClick={()=>setModal(null)}><X/></button></header>{modal==='user'&&<div className="admin-form"><label>Prénom<input name="firstName" required/></label><label>Nom<input name="lastName" required/></label><label className="wide">E-mail<input name="email" type="email" required/></label><label>Rôle<select name="role">{ROLES.map(r=><option key={r}>{r}</option>)}</select></label><label>Service<select name="department">{SERVICES.map(s=><option key={s}>{s}</option>)}</select></label><label>Poste interne<input name="extension"/></label></div>}{modal==='room'&&<div className="admin-form"><label className="wide">Nom de la salle<input name="name" required/></label><label>Capacité<input name="capacity" type="number" min="1" required/></label><label>Emplacement<input name="location" required/></label></div>}{modal==='category'&&<div className="admin-form"><label className="wide">Nom de la catégorie<input name="label" required/></label><label>Service par défaut<select name="department">{SERVICES.map(s=><option key={s}>{s}</option>)}</select></label></div>}<footer><button type="button" onClick={()=>setModal(null)}>Annuler</button><button type="submit">Enregistrer</button></footer></form></div>}
 </div>;
}
