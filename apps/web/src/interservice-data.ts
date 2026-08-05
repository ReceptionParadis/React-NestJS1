export type MealService = 'Petit-déjeuner' | 'Déjeuner' | 'Dîner';
export type GroupArrival = 'Prévu' | 'En route' | 'Arrivé';
export type HousekeepingStatus = 'À faire' | 'OK propre' | 'OK recouche';
export type KitchenStatus = 'À préparer' | 'Prêt à servir';
export type RestaurantStatus = 'Prévu' | 'En salle' | 'Terminé';
export type OperationalDepartment = 'reception' | 'restaurant' | 'housekeeping' | 'cuisine';

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
};

const KEY = 'hospicore.function-sheets.v1';

export const demoFunctionSheets: FunctionSheet[] = [
  {
    id: 'marian', groupName: 'Marian Pilgrimages', arrivalDate: '2026-08-05', departureDate: '2026-08-08', arrivalTime: '16:00', pax: 54,
    agency: 'Marian Pilgrimages', leader: 'John Murphy', arrivalStatus: 'En route', housekeepingStatus: 'À faire', acknowledgements: {},
    meals: [
      { service: 'Dîner', time: '19:00', pax: 54, room: 'Restaurant principal', diets: '2 sans gluten', notes: 'Service rapide après arrivée', kitchenStatus: 'À préparer', restaurantStatus: 'Prévu' },
      { service: 'Petit-déjeuner', time: '07:00', pax: 54, room: 'Restaurant principal', notes: 'Départ bus à 08:15', kitchenStatus: 'À préparer', restaurantStatus: 'Prévu' },
    ],
    housekeepingNotes: 'Priorité bagages et chambres du 4e étage.', kitchenNotes: 'Prévoir 2 repas sans gluten.', receptionNotes: 'Cartes à finaliser avant 15h30.', commercialNotes: 'Demi-pension confirmée.',
  },
  {
    id: 'unitalsi', groupName: 'Unitalsi', arrivalDate: '2026-08-05', departureDate: '2026-08-09', arrivalTime: '17:45', pax: 82,
    agency: 'Unitalsi', leader: 'Maria Rossi', arrivalStatus: 'Prévu', housekeepingStatus: 'À faire', acknowledgements: {},
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

export function saveFunctionSheets(items: FunctionSheet[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('hospicore:function-sheets'));
}

export function acknowledgeFunctionSheet(id: string, department: OperationalDepartment) {
  const now = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const items = loadFunctionSheets().map((item) => item.id === id ? {
    ...item,
    acknowledgements: { ...item.acknowledgements, [department]: now },
  } : item);
  saveFunctionSheets(items);
  return items;
}

export function markGroupArrived(id: string) {
  const items = loadFunctionSheets().map((item) => item.id === id ? {
    ...item,
    arrivalStatus: 'Arrivé' as const,
    housekeepingStatus: 'À faire' as const,
    receptionConfirmedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  } : item);
  saveFunctionSheets(items);
  return items;
}

export function markHousekeepingDone(id: string, status: Exclude<HousekeepingStatus, 'À faire'>) {
  const items = loadFunctionSheets().map((item) => item.id === id ? {
    ...item,
    housekeepingStatus: status,
    housekeepingConfirmedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  } : item);
  saveFunctionSheets(items);
  return items;
}

export function markMealKitchenReady(groupId: string, service: MealService) {
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const items = loadFunctionSheets().map((item) => item.id === groupId ? {
    ...item,
    meals: item.meals.map((meal) => meal.service === service ? { ...meal, kitchenStatus: 'Prêt à servir' as const, kitchenConfirmedAt: now } : meal),
  } : item);
  saveFunctionSheets(items);
  return items;
}

export function markMealRestaurantStatus(groupId: string, service: MealService, status: RestaurantStatus) {
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const items = loadFunctionSheets().map((item) => item.id === groupId ? {
    ...item,
    meals: item.meals.map((meal) => meal.service === service ? { ...meal, restaurantStatus: status, restaurantConfirmedAt: now } : meal),
  } : item);
  saveFunctionSheets(items);
  return items;
}

export function getHousekeepingTask(item: FunctionSheet, today = new Date().toISOString().slice(0, 10)) {
  if (item.arrivalStatus !== 'Arrivé') return 'En attente de l’arrivée' as const;
  if (today === item.arrivalDate) return 'Propre arrivée' as const;
  if (today > item.arrivalDate && today < item.departureDate) return 'Recouche' as const;
  return 'Aucune tâche' as const;
}
