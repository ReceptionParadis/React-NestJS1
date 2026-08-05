export type MealService = 'Petit-déjeuner' | 'Déjeuner' | 'Dîner';
export type GroupArrival = 'Prévu' | 'En route' | 'Arrivé';

export type MealPlan = {
  service: MealService;
  time: string;
  pax: number;
  room: string;
  diets?: string;
  notes?: string;
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
  housekeepingNotes: string;
  kitchenNotes: string;
  receptionNotes: string;
  commercialNotes: string;
};

const KEY = 'hospicore.function-sheets.v1';

export const demoFunctionSheets: FunctionSheet[] = [
  {
    id: 'marian', groupName: 'Marian Pilgrimages', arrivalDate: '2026-08-05', departureDate: '2026-08-08', arrivalTime: '16:00', pax: 54,
    agency: 'Marian Pilgrimages', leader: 'John Murphy', arrivalStatus: 'En route',
    meals: [
      { service: 'Dîner', time: '19:00', pax: 54, room: 'Restaurant principal', diets: '2 sans gluten', notes: 'Service rapide après arrivée' },
      { service: 'Petit-déjeuner', time: '07:00', pax: 54, room: 'Restaurant principal', notes: 'Départ bus à 08:15' },
    ],
    housekeepingNotes: 'Priorité bagages et chambres du 4e étage.', kitchenNotes: 'Prévoir 2 repas sans gluten.', receptionNotes: 'Cartes à finaliser avant 15h30.', commercialNotes: 'Demi-pension confirmée.',
  },
  {
    id: 'unitalsi', groupName: 'Unitalsi', arrivalDate: '2026-08-05', departureDate: '2026-08-09', arrivalTime: '17:45', pax: 82,
    agency: 'Unitalsi', leader: 'Maria Rossi', arrivalStatus: 'Prévu',
    meals: [
      { service: 'Dîner', time: '19:30', pax: 82, room: 'Salle Gavarnie', diets: '4 mixés · 2 sans lactose', notes: '2 tables PMR proches de l’entrée' },
      { service: 'Petit-déjeuner', time: '07:30', pax: 82, room: 'Salle Gavarnie' },
      { service: 'Déjeuner', time: '12:15', pax: 82, room: 'Salle Gavarnie' },
    ],
    housekeepingNotes: 'Prévoir 2 chambres PMR contrôlées.', kitchenNotes: '4 textures mixées.', receptionNotes: 'Deux bus et assistance PMR.', commercialNotes: 'Pension complète.',
  },
];

export function loadFunctionSheets(): FunctionSheet[] {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : demoFunctionSheets;
  } catch {
    return demoFunctionSheets;
  }
}

export function saveFunctionSheets(items: FunctionSheet[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('hospicore:function-sheets'));
}

export function markGroupArrived(id: string) {
  const items = loadFunctionSheets().map((item) => item.id === id ? {
    ...item,
    arrivalStatus: 'Arrivé' as const,
    receptionConfirmedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  } : item);
  saveFunctionSheets(items);
  return items;
}
