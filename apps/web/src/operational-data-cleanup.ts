const GROUP_LEGACY_KEYS = new Set([
  'restaurantState','kitchenState','housekeepingState',
  'restaurantStatus','kitchenStatus','housekeepingStatus',
  'restaurantNotes','kitchenNotes','housekeepingNotes',
  'restaurantValidatedAt','kitchenValidatedAt','housekeepingValidatedAt',
]);

function cleanGroup(group: unknown) {
  if (!group || typeof group !== 'object' || Array.isArray(group)) return group;
  const source = group as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!GROUP_LEGACY_KEYS.has(key)) cleaned[key] = value;
  }
  if (!cleaned.directAgency && typeof cleaned.agency === 'string') cleaned.directAgency = cleaned.agency;
  if (!cleaned.agency && typeof cleaned.directAgency === 'string') cleaned.agency = cleaned.directAgency;
  if (!Array.isArray(cleaned.audit)) cleaned.audit = [];
  return cleaned;
}

export function cleanOperationalPayload<T>(namespace: string, payload: T): T {
  if (namespace === 'group-360' && Array.isArray(payload)) {
    return payload.map(cleanGroup) as T;
  }
  return payload;
}
