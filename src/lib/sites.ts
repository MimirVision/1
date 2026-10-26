import type { DoseLog, InjectionSiteId } from './types';

export interface InjectionSite {
  id: InjectionSiteId;
  label: string;
  short: string;
  /** Position on the body map, 0–1 of the body map's width and height. */
  x: number;
  y: number;
}

export const INJECTION_SITES: InjectionSite[] = [
  { id: 'abdomen_upper_left', label: 'Abdomen · upper left', short: 'Upper L belly', x: 0.4, y: 0.37 },
  { id: 'abdomen_upper_right', label: 'Abdomen · upper right', short: 'Upper R belly', x: 0.6, y: 0.37 },
  { id: 'abdomen_lower_left', label: 'Abdomen · lower left', short: 'Lower L belly', x: 0.4, y: 0.49 },
  { id: 'abdomen_lower_right', label: 'Abdomen · lower right', short: 'Lower R belly', x: 0.6, y: 0.49 },
  { id: 'thigh_left', label: 'Thigh · left', short: 'Left thigh', x: 0.43, y: 0.72 },
  { id: 'thigh_right', label: 'Thigh · right', short: 'Right thigh', x: 0.57, y: 0.72 },
  { id: 'arm_left', label: 'Upper arm · left', short: 'Left arm', x: 0.23, y: 0.32 },
  { id: 'arm_right', label: 'Upper arm · right', short: 'Right arm', x: 0.77, y: 0.32 },
];

export function siteInfo(id: InjectionSiteId): InjectionSite {
  return INJECTION_SITES.find((s) => s.id === id) as InjectionSite;
}

/** Last time each site was used (epoch ms), across the given doses. */
export function lastUsedBySite(doses: DoseLog[]): Partial<Record<InjectionSiteId, number>> {
  const map: Partial<Record<InjectionSiteId, number>> = {};
  for (const d of doses) {
    if (!d.site) continue;
    const t = Date.parse(d.takenAt);
    const previous = map[d.site];
    if (previous === undefined || t > previous) map[d.site] = t;
  }
  return map;
}

/**
 * Suggests the next site to rotate to: any never-used site first (in body-map order), otherwise
 * the least recently used one. Never suggests the site used last.
 */
export function suggestNextSite(doses: DoseLog[]): InjectionSiteId {
  const used = lastUsedBySite(doses);
  const unused = INJECTION_SITES.find((s) => used[s.id] === undefined);
  if (unused) return unused.id;
  let best = INJECTION_SITES[0].id;
  let bestTime = Infinity;
  for (const s of INJECTION_SITES) {
    const t = used[s.id] ?? -Infinity;
    if (t < bestTime) {
      bestTime = t;
      best = s.id;
    }
  }
  return best;
}
