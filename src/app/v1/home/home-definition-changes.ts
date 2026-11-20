import { HomeDashboardDefinition } from '@domain/home/home-dashboard';

export interface HomeDefinitionChange { readonly field: string; readonly saved: string; readonly draft: string; }
const LABELS: Readonly<Record<string, string>> = {
  version: 'Format version', name: 'Dashboard name', visibility: 'Visibility', defaults: 'Dashboard defaults', widgets: 'Widget',
  id: 'Identity', kind: 'Type', size: 'Size', title: 'Title', text: 'Note text', visualizationGuid: 'Saved visualization identity',
  inherit: 'Inherited dashboard settings', overrides: 'Widget display overrides', destination: 'Internal destination', area: 'Workspace section',
  owner: 'Owner', resource: 'Resource', guid: 'Identity', settings: 'Settings', binding: 'Analysis binding', analysisGuid: 'Analysis identity',
  period: 'Period', displaySettings: 'Display settings', emissionsTreatment: 'Emissions treatment', scope: 'Scope', view: 'View', measure: 'Measure',
  category: 'Category', facilityGuids: 'Facility identities', energyTreatment: 'Energy treatment', units: 'Units'
};

/** Read-only comparison of every persisted leaf; keeping a draft replaces the whole definition. */
export function homeDefinitionChanges(saved: HomeDashboardDefinition | undefined, draft: HomeDashboardDefinition | undefined): HomeDefinitionChange[] {
  const flatten = (value: unknown, path: string[] = [], result = new Map<string, string>()): Map<string, string> => {
    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length) for (const [key, child] of entries) flatten(child, [...path, /^\d+$/.test(key) ? `${Number(key) + 1}` : LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2')], result);
      else result.set(path.join(' · '), Array.isArray(value) ? 'Empty list' : 'No settings');
    } else if (value !== undefined) result.set(path.join(' · '), value === '' ? 'Empty text' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value));
    return result;
  };
  const left = flatten(saved), right = flatten(draft);
  return [...new Set([...left.keys(), ...right.keys()])].flatMap(field => left.get(field) === right.get(field) ? []
    : [{ field, saved: left.get(field) ?? 'Not set', draft: right.get(field) ?? 'Not set' }]);
}
