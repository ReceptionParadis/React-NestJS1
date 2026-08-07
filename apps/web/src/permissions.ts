export type AppRole = 'direction' | 'reception_manager' | 'reception' | 'commercial' | 'maintenance' | 'unknown';

export type Capability =
  | 'dashboard.view'
  | 'reception.view'
  | 'reception.operate'
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

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function roleFromValue(value: unknown): AppRole {
  const raw = normalize(String(typeof value === 'object' && value && 'name' in value ? (value as { name?: string }).name || '' : value || ''));
  if (raw.includes('direction') || raw.includes('directeur') || raw.includes('admin')) return 'direction';
  if (
    raw.includes('chef de reception') ||
    raw.includes('chef reception') ||
    raw.includes('responsable de reception') ||
    raw.includes('responsable reception') ||
    raw.includes('front office manager')
  ) return 'reception_manager';
  if (raw.includes('maintenance') || raw.includes('technique') || raw.includes('technicien')) return 'maintenance';
  if (raw.includes('commercial') || raw.includes('vente')) return 'commercial';
  if (raw.includes('reception') || raw.includes('front')) return 'reception';
  return 'unknown';
}

export function currentRole(): AppRole {
  try {
    const session = JSON.parse(localStorage.getItem('hospicore.session') || '{}');
    return roleFromValue(session?.user?.role);
  } catch {
    return 'unknown';
  }
}

const matrix: Record<AppRole, ReadonlySet<Capability>> = {
  direction: new Set<Capability>([
    'dashboard.view','reception.view','reception.operate','group-control.create','group-control.unlock',
    'commercial.view','commercial.edit','commercial.validate-control',
    'maintenance.view','maintenance.create','maintenance.manage',
    'planning.view','meeting-rooms.view','meeting-rooms.edit','tasks.view','tasks.edit',
    'instructions.view','instructions.edit','operations-center.view','operations-center.edit',
    'journal.view','diagnostic.view','administration.view',
  ]),
  reception_manager: new Set<Capability>([
    'dashboard.view','reception.view','reception.operate','group-control.create','group-control.unlock',
    'maintenance.view','maintenance.create','planning.view','meeting-rooms.view','meeting-rooms.edit',
    'tasks.view','tasks.edit','instructions.view','operations-center.view','operations-center.edit','journal.view',
    'diagnostic.view','administration.view',
  ]),
  reception: new Set<Capability>([
    'dashboard.view','reception.view','reception.operate','group-control.create',
    'maintenance.view','maintenance.create','planning.view','meeting-rooms.view','meeting-rooms.edit',
    'tasks.view','tasks.edit','instructions.view','operations-center.view','operations-center.edit','journal.view',
    'diagnostic.view','administration.view',
  ]),
  commercial: new Set<Capability>([
    'dashboard.view','commercial.view','commercial.edit','commercial.validate-control','group-control.unlock',
    'maintenance.view','maintenance.create','planning.view','meeting-rooms.view','meeting-rooms.edit',
    'tasks.view','tasks.edit','instructions.view','journal.view',
  ]),
  maintenance: new Set<Capability>([
    'dashboard.view','maintenance.view','maintenance.create','maintenance.manage',
    'planning.view','meeting-rooms.view','tasks.view','tasks.edit','instructions.view',
  ]),
  unknown: new Set<Capability>(['dashboard.view']),
};

export function can(capability: Capability, role: AppRole = currentRole()) {
  return matrix[role].has(capability);
}

export function canAccessPath(path: string, role: AppRole = currentRole()) {
  if (path === '/' || path === '') return can('dashboard.view', role);
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
