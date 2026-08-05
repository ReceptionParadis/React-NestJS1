export type MealService = 'Petit-déjeuner' | 'Déjeuner' | 'Dîner';
export type GroupArrival = 'Prévu' | 'En route' | 'Arrivé';
export type HousekeepingStatus = 'À faire' | 'OK propre' | 'OK recouche';
export type KitchenStatus = 'À préparer' | 'Prêt à servir';
export type RestaurantStatus = 'Prévu' | 'En salle' | 'Terminé';
export type OperationalDepartment = 'reception' | 'restaurant' | 'housekeeping' | 'cuisine';

export type AuditEntry = {
  id: string;
  action: string;
  user: string;
  role: string;
  at: string;
};

export type MealPlan = {
  service: MealService;
  time: string;
  pax: number;
  room: string;
  diets?: string;
  notes?: string;
  kitchenStatus?: KitchenStatus;
  kitchenConfirmedAt?: string;
  restaurantStatus?: RestaurantStatus;
  restaurantConfirmedAt?: string;
};

export type FunctionSheet = {
  id: string;
  groupName: string;
  arrivalDate: string;
  departureDate: string;
  arrivalTime: string;
  pax: number;
  agency: string;
  leader: string;
  arrivalStatus: GroupArrival;
  receptionConfirmedAt?: string;
  meals: MealPlan[];
  housekeepingStatus: HousekeepingStatus;
  housekeepingConfirmedAt?: string;
  housekeepingNotes: string;
  kitchenNotes: string;
  receptionNotes: string;
  commercialNotes: string;
  acknowledgements: Partial<Record<OperationalDepartment, string>>;
  updatedAt?: string;
  updatedBy?: string;
  auditTrail: AuditEntry[];
};

const KEY = 'hospicore.function-sheets.v1';

function currentSignature() {
  try {
    const raw = localStorage.getItem('hospicore.session');
    const session = raw ? JSON.parse(raw) : null;
    const firstName = String(session?.user?.firstName || '').trim();
    const lastName = String(session?.user?.lastName || '').trim();
    return {
      user: `${firstName} ${lastName}`.trim() || String(session?.user?.email || 'Utilisateur HospiCore'),
      role: String(session?.user?.role || 'Utilisateur'),
    };
  } catch {
    return { user: 'Utilisateur HospiCore', role: 'Utilisateur' };
  }
}

function timestamp() {
  return new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function signed(item: FunctionSheet, action: string): FunctionSheet {
  const signature = currentSignature();
  const at = timestamp();
  return {
    ...item,
    updatedAt: at,
    updatedBy: signature.user,
    auditTrail: [
      { id: crypto.randomUUID(), action, user: signature.user, role: signature.role, at },
      ...(item.auditTrail || []),
    ],
  };
}

export const demoFunctionSheets: FunctionSheet[] = [
  {
    id: 'marian', groupName: 'Marian Pilgrimages', arrivalDate: '2026-08-05', departureDate: '2026-08-08', arrivalTime: '16:00', pax: 54,
    agency: 'Marian Pilgrimages', leader: 'John Murphy', arrivalStatus: 'En route', housekeepingStatus: 'À faire', acknowledgements: {}, auditTrail: [],
    meals: [
      { service: 'Dîner', time: '19:00', pax: 54, room: 'Restaurant principal', diets: '2 sans gluten', notes: 'Service rapide après arrivée', kitchenStatus: 'À préparer', restaurantStatus: 'Prévu' },
      { service: 'Petit-déjeuner', time: '07:00', pax: 54, room: 'Restaurant principal', notes: 'Départ bus à 08:15', kitchenStatus: 'À préparer', restaurantStatus: 'Prévu' },
    ],
    housekeepingNotes: 'Priorité bagages et chambres du 4e étage.', kitchenNotes: 'Prévoir 2 repas sans gluten.', receptionNotes: 'Cartes à finaliser avant 15h30.', commercialNotes: 'Demi-pension confirmée.',
  },
  {
    id: 'unitalsi', groupName: 'Unitalsi', arrivalDate: '2026-08-05', departureDate: '2026-08-09', arrivalTime: '17:45', pax: 82,
    agency: 'Unitalsi', leader: 'Maria Rossi', arrivalStatus: 'Prévu', housekeepingStatus: 'À faire', acknowledgements: {}, auditTrail: [],
    meals: [
      { service: 'Dîner', time: '19:30', pax: 82, room: 'Salle Gavarnie', diets: '4 mixés · 2 sans lactose', notes: '2 tables PMR proches de l’entrée', kitchenStatus: 'À préparer', restaurantStatus: 'Prévu' },
      { service: 'Petit-déjeuner', time: '07:30', pax: 82, room: 'Salle Gavarnie', kitchenStatus: 'À préparer', restaurantStatus: 'Prévu' },
      { service: 'Déjeuner', time: '12:15', pax: 82, room: 'Salle Gavarnie', kitchenStatus: 'À préparer', restaurantStatus: 'Prévu' },
    ],
    housekeepingNotes: 'Prévoir 2 chambres PMR contrôlées.', kitchenNotes: '4 textures mixées.', receptionNotes: 'Deux bus et assistance PMR.', commercialNotes: 'Pension complète.',
  },
];

function normalizeSheet(item: FunctionSheet): FunctionSheet {
  return {
    ...item,
    housekeepingStatus: item.housekeepingStatus || 'À faire',
    acknowledgements: item.acknowledgements || {},
    auditTrail: item.auditTrail || [],
    meals: (item.meals || []).map((meal) => ({
      ...meal,
      kitchenStatus: meal.kitchenStatus || 'À préparer',
      restaurantStatus: meal.restaurantStatus || 'Prévu',
    })),
  };
}

export function loadFunctionSheets(): FunctionSheet[] {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? (JSON.parse(saved) as FunctionSheet[]).map(normalizeSheet) : demoFunctionSheets.map(normalizeSheet);
  } catch {
    return demoFunctionSheets.map(normalizeSheet);
  }
}

function persist(items: FunctionSheet[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('hospicore:function-sheets'));
}

export function saveFunctionSheets(items: FunctionSheet[], action = 'Fiche de fonction mise à jour') {
  const previous = loadFunctionSheets();
  const next = items.map((item) => {
    const old = previous.find((candidate) => candidate.id === item.id);
    return signed({ ...item, auditTrail: item.auditTrail || old?.auditTrail || [] }, old ? action : 'Fiche de fonction créée');
  });
  persist(next);
  return next;
}

export function acknowledgeFunctionSheet(id: string, department: OperationalDepartment) {
  const now = timestamp();
  const items = loadFunctionSheets().map((item) => item.id === id ? signed({
    ...item,
    acknowledgements: { ...item.acknowledgements, [department]: now },
  }, `Prise de connaissance confirmée — ${department}`) : item);
  persist(items);
  return items;
}

export function markGroupArrived(id: string) {
  const items = loadFunctionSheets().map((item) => item.id === id ? signed({
    ...item,
    arrivalStatus: 'Arrivé' as const,
    housekeepingStatus: 'À faire' as const,
    receptionConfirmedAt: timestamp(),
  }, 'Groupe marqué arrivé par la réception') : item);
  persist(items);
  return items;
}

export function markHousekeepingDone(id: string, status: Exclude<HousekeepingStatus, 'À faire'>) {
  const items = loadFunctionSheets().map((item) => item.id === id ? signed({
    ...item,
    housekeepingStatus: status,
    housekeepingConfirmedAt: timestamp(),
  }, `Housekeeping validé — ${status}`) : item);
  persist(items);
  return items;
}

export function markMealKitchenReady(groupId: string, service: MealService) {
  const now = timestamp();
  const items = loadFunctionSheets().map((item) => item.id === groupId ? signed({
    ...item,
    meals: item.meals.map((meal) => meal.service === service ? { ...meal, kitchenStatus: 'Prêt à servir' as const, kitchenConfirmedAt: now } : meal),
  }, `Cuisine prête à servir — ${service}`) : item);
  persist(items);
  return items;
}

export function markMealRestaurantStatus(groupId: string, service: MealService, status: RestaurantStatus) {
  const now = timestamp();
  const items = loadFunctionSheets().map((item) => item.id === groupId ? signed({
    ...item,
    meals: item.meals.map((meal) => meal.service === service ? { ...meal, restaurantStatus: status, restaurantConfirmedAt: now } : meal),
  }, `Restaurant — ${service} : ${status}`) : item);
  persist(items);
  return items;
}

export function getHousekeepingTask(item: FunctionSheet, today = new Date().toISOString().slice(0, 10)) {
  if (item.arrivalStatus !== 'Arrivé') return 'En attente de l’arrivée' as const;
  if (today === item.arrivalDate) return 'Propre arrivée' as const;
  if (today > item.arrivalDate && today < item.departureDate) return 'Recouche' as const;
  return 'Aucune tâche' as const;
}
