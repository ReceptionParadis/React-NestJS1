const LEGACY_SERVICES = new Set(['Housekeeping','Restaurant','Cuisine']);
const GROUP_LEGACY_KEYS = new Set([
  'restaurantState','kitchenState','housekeepingState',
  'restaurantStatus','kitchenStatus','housekeepingStatus',
  'restaurantNotes','kitchenNotes','housekeepingNotes',
  'restaurantValidatedAt','kitchenValidatedAt','housekeepingValidatedAt',
]);
const SHEET_LEGACY_KEYS = new Set(['restaurantSummary','cuisineSummary','housekeepingType']);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function cleanGroup(group: unknown) {
  const source = asRecord(group);
  if (!source) return group;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) if (!GROUP_LEGACY_KEYS.has(key)) cleaned[key] = value;
  if (!cleaned.directAgency && typeof cleaned.agency === 'string') cleaned.directAgency = cleaned.agency;
  if (!cleaned.agency && typeof cleaned.directAgency === 'string') cleaned.agency = cleaned.directAgency;
  if (!Array.isArray(cleaned.audit)) cleaned.audit = [];
  return cleaned;
}

function cleanServiceItem(item: unknown) {
  const source = asRecord(item);
  if (!source) return item;
  return LEGACY_SERVICES.has(String(source.service || '')) ? null : source;
}

function cleanMeeting(item: unknown) {
  const source = asRecord(item);
  if (!source) return item;
  return { ...source, service: LEGACY_SERVICES.has(String(source.service || '')) || source.service === 'Groupes' ? 'Réception' : source.service || 'Réception' };
}

function cleanFunctionLine(line: unknown) {
  const source = asRecord(line);
  if (!source) return line;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) if (!SHEET_LEGACY_KEYS.has(key)) cleaned[key] = value;
  if (!cleaned.mealSummary) {
    const values = [source.restaurantSummary, source.cuisineSummary].map(value => String(value || '')).filter(value => value && value !== 'RAS');
    cleaned.mealSummary = values.join(' · ') || 'RAS';
  }
  if (!cleaned.roomService) cleaned.roomService = source.housekeepingType || 'Standard';
  return cleaned;
}

function cleanFunctionSheet(sheet: unknown) {
  const source = asRecord(sheet);
  if (!source) return sheet;
  return { ...source, lines: Array.isArray(source.lines) ? source.lines.map(cleanFunctionLine) : [] };
}

export function cleanOperationalPayload<T>(namespace: string, payload: T): T {
  if (namespace === 'group-360' && Array.isArray(payload)) return payload.map(cleanGroup) as T;
  if ((namespace === 'tasks' || namespace === 'general-instructions') && Array.isArray(payload)) return payload.map(cleanServiceItem).filter(Boolean) as T;
  if (namespace === 'meeting-rooms' && Array.isArray(payload)) return payload.map(cleanMeeting) as T;
  if (namespace === 'function-sheets' && Array.isArray(payload)) return payload.map(cleanFunctionSheet) as T;
  return payload;
}
