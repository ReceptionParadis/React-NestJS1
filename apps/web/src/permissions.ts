export type AppRole = 'direction' | 'reception_manager' | 'reception' | 'commercial' | 'maintenance' | 'unknown';

export type Capability =
  | 'dashboard.view'
  | 'reception.view'
  | 'reception.operate'
  | 'cash.view'
  | 'cash.edit'
  | 'cash.validate'
  | 'group-control.create'
  | 'group-control.unlock'
  | 'commercial.view'
  | 'commercial.edit'
  | 'commercial.validate-control'
  | 'maintenance.view'
  | 'maintenance.create'
  | 'maintenance.manage'
  | 'planning.view'
  | 'meeting-rooms.view'
  | 'meeting-rooms.edit'
  | 'tasks.view'
  | 'tasks.edit'
  | 'instructions.view'
  | 'instructions.edit'
  | 'operations-center.view'
  | 'operations-center.edit'
  | 'journal.view'
  | 'diagnostic.view'
  | 'administration.view';

function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

export function roleFromValue(value: unknown): AppRole {
  if (typeof value === 'object' && value) {
    const baseRole = String((value as { baseRole?: string }).baseRole || '') as AppRole;
    if (['direction','reception_manager','reception','commercial','maintenance'].includes(baseRole)) return baseRole;
  }
  const raw = normalize(String(typeof value === 'object' && value && 'name' in value ? (value as { name?: string }).name || '' : value || ''));
  if (raw.includes('direction') || raw.includes('directeur') || raw.includes('admin')) return 'direction';
  if (raw.includes('chef de reception') || raw.includes('chef reception') || raw.includes('responsable de reception') || raw.includes('responsable reception') || raw.includes('front office manager')) return 'reception_manager';
  if (raw.includes('maintenance') || raw.includes('technique') || raw.includes('technicien')) return 'maintenance';
  if (raw.includes('commercial') || raw.includes('vente')) return 'commercial';
  if (raw.includes('reception') || raw.includes('front')) return 'reception';
  return 'unknown';
}

function sessionUser(){try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')?.user||{}}catch{return{}}}
export function currentRole(): AppRole { return roleFromValue(sessionUser().role); }

const matrix: Record<AppRole, ReadonlySet<Capability>> = {
  direction: new Set<Capability>(['dashboard.view','reception.view','reception.operate','cash.view','cash.edit','cash.validate','group-control.create','group-control.unlock','commercial.view','commercial.edit','commercial.validate-control','maintenance.view','maintenance.create','maintenance.manage','planning.view','meeting-rooms.view','meeting-rooms.edit','tasks.view','tasks.edit','instructions.view','instructions.edit','operations-center.view','operations-center.edit','journal.view','diagnostic.view','administration.view']),
  reception_manager: new Set<Capability>(['dashboard.view','reception.view','reception.operate','cash.view','cash.edit','group-control.create','group-control.unlock','maintenance.view','maintenance.create','planning.view','meeting-rooms.view','meeting-rooms.edit','tasks.view','tasks.edit','instructions.view','instructions.edit','operations-center.view','operations-center.edit','journal.view','diagnostic.view']),
  reception: new Set<Capability>(['dashboard.view','reception.view','reception.operate','cash.view','cash.edit','group-control.create','maintenance.view','maintenance.create','planning.view','meeting-rooms.view','meeting-rooms.edit','tasks.view','tasks.edit','instructions.view','instructions.edit','operations-center.view','operations-center.edit','journal.view']),
  commercial: new Set<Capability>(['dashboard.view','commercial.view','commercial.edit','commercial.validate-control','group-control.unlock','maintenance.view','maintenance.create','planning.view','meeting-rooms.view','meeting-rooms.edit','tasks.view','tasks.edit','instructions.view','instructions.edit','journal.view']),
  maintenance: new Set<Capability>(['dashboard.view','maintenance.view','maintenance.create','maintenance.manage','planning.view','meeting-rooms.view','tasks.view','tasks.edit','instructions.view','instructions.edit']),
  unknown: new Set<Capability>(['dashboard.view']),
};

export function capabilitiesForRole(role: AppRole) { return Array.from(matrix[role]); }
export function allCapabilities(): Capability[]{return Array.from(new Set(Object.values(matrix).flatMap(set=>Array.from(set)))) as Capability[]}

function sessionPermissions():ReadonlySet<Capability>|null{const raw=sessionUser().permissions;if(!Array.isArray(raw))return null;return new Set(raw.filter((item:unknown)=>typeof item==='string') as Capability[])}

export function can(capability: Capability, role: AppRole = currentRole()) {
  const current=currentRole(),overrides=role===current?sessionPermissions():null;
  return overrides ? overrides.has(capability) : matrix[role].has(capability);
}

export function canAccessPath(path: string, role: AppRole = currentRole()) {
  if (path === '/' || path === '') return can('dashboard.view', role);
  if (path.startsWith('/reception/caisse')) return can('cash.view', role);
  if (path.startsWith('/reception')) return can('reception.view', role);
  if (path.startsWith('/commercial') || path.startsWith('/groupes') || path.startsWith('/planning-hebdomadaire')) return can('commercial.view', role);
  if (path.startsWith('/tickets')) return can('maintenance.view', role);
  if (path.startsWith('/planning-operationnel')) return can('planning.view', role);
  if (path.startsWith('/salles-reunion')) return can('meeting-rooms.view', role);
  if (path.startsWith('/taches')) return can('tasks.view', role);
  if (path.startsWith('/consignes-generales')) return can('instructions.view', role);
  if (path.startsWith('/centre-operations') || path.startsWith('/cahier-consignes') || path.startsWith('/prets') || path.startsWith('/inventaire')) return can('operations-center.view', role);
  if (path.startsWith('/journal-exploitation') || path.startsWith('/activite') || path.startsWith('/main-courante')) return can('journal.view', role);
  if (path.startsWith('/diagnostic')) return can('diagnostic.view', role);
  if (path.startsWith('/administration') || path.startsWith('/parametres')) return can('administration.view', role);
  return false;
}
