import Constants from 'expo-constants';

// A production portal dependency, not the Expo preview/API hostname.
// Configured centrally in the static Expo manifest.
const configured = Constants.expoConfig?.extra?.portalUrl as unknown;
if (typeof configured !== 'string' || !configured.startsWith('https://')) {
  throw new Error('The secure Driver portal address is not configured.');
}
export const PORTAL_URL = new URL(configured).origin + '/';
export const PORTAL_ORIGIN = new URL(PORTAL_URL).origin;
export const sections = [
  { id: 'assigned', title: 'Assigned Jobs', detail: 'Vehicles ready for pickup', icon: 'clipboard' },
  { id: 'active', title: 'Active Jobs', detail: 'Pickups & journeys in progress', icon: 'truck' },
  { id: 'delivered', title: 'Delivered', detail: 'Completed jobs & evidence', icon: 'check-circle' },
  { id: 'companyId', title: 'Digital ID', detail: 'Your company-issued card', icon: 'credit-card' },
  { id: 'tradePlate', title: 'Assigned trade plate', detail: 'Plate number & expiry from HR', icon: 'tag' },
  { id: 'payments', title: 'Payments', detail: 'Paid & pending payslips', icon: 'file-text' },
  { id: 'incidents', title: 'Incident reports', detail: 'Report & upload evidence', icon: 'alert-triangle' },
  { id: 'holidays', title: 'Holidays', detail: 'Requests & availability', icon: 'calendar' },
  { id: 'profile', title: 'My profile', detail: 'Details managed by HR', icon: 'user' },
] as const;
// Old IDs remain valid internally, but are not separate home destinations.
export type Section = typeof sections[number]['id'] | 'jobs' | 'history';
export function navigationKind(url: string): 'portal' | 'external' | 'blocked' {
  if (url === 'about:blank') return 'portal';
  try {
    const parsed = new URL(url);
    if (parsed.origin === PORTAL_ORIGIN && parsed.protocol === 'https:') return 'portal';
    if (['https:', 'tel:', 'mailto:'].includes(parsed.protocol)) return 'external';
  } catch { /* malformed URL */ }
  return 'blocked';
}
