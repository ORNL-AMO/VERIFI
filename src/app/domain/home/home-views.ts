import { HomeDashboardReference, HomeTemplate, HomeViewPreferences } from './home-dashboard';

export const homeViewKey = (reference: HomeDashboardReference): string => reference.kind === 'saved'
  ? JSON.stringify(['saved', reference.dashboardGuid]) : JSON.stringify(['built-in', reference.template, reference.version]);

export interface HomeViewCandidate {
  readonly reference: HomeDashboardReference;
  readonly available: boolean;
  readonly visible: boolean;
}

/** Pure resolution: imported/initialized empty sets and unknown preferences are never rewritten. */
export function resolveHomeViews(input: {
  readonly initialization: 'new' | 'legacy' | 'initialized' | 'unavailable';
  readonly preferences?: HomeViewPreferences;
  readonly candidates: readonly HomeViewCandidate[];
  readonly legacyOrder: readonly string[];
  readonly legacyDefault?: string;
  readonly deletedStarters: readonly HomeTemplate[];
}) {
  const prefs = input.preferences;
  const permitted = input.candidates.filter(candidate => {
    const ref = candidate.reference, key = homeViewKey(ref);
    if (prefs?.deleted.some(item => homeViewKey(item) === key)) return false;
    if (ref.kind === 'saved') return true;
    if (input.initialization === 'unavailable' || input.deletedStarters.includes(ref.template)) return false;
    if (!prefs) return input.initialization === 'new';
    return prefs.catalog.some(item => homeViewKey(item) === key);
  });
  const order = prefs?.order.map(homeViewKey) ?? input.legacyOrder.map(dashboardGuid => homeViewKey({ kind: 'saved', dashboardGuid }));
  const entries = [...permitted].sort((a, b) => {
    const ai = order.indexOf(homeViewKey(a.reference)), bi = order.indexOf(homeViewKey(b.reference));
    return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
  });
  const visible = entries.filter(item => item.available && item.visible && !prefs?.hidden.some(ref => homeViewKey(ref) === homeViewKey(item.reference)));
  const requested = prefs ? prefs.default : input.legacyDefault ? { kind: 'saved' as const, dashboardGuid: input.legacyDefault } : undefined;
  return { entries, visible, default: visible.find(item => requested && homeViewKey(item.reference) === homeViewKey(requested))?.reference ?? visible[0]?.reference };
}

/** First explicit preference save freezes available choices; viewing never calls a command. */
export function captureHomeViewPreferences(candidates: readonly HomeViewCandidate[], selected?: HomeDashboardReference): HomeViewPreferences {
  const order = candidates.map(item => structuredClone(item.reference));
  return { version: 1, catalog: order.filter((item): item is Extract<HomeDashboardReference, { kind: 'built-in' }> => item.kind === 'built-in'),
    order, ...(selected ? { default: structuredClone(selected) } : {}), hidden: [], deleted: [] };
}
