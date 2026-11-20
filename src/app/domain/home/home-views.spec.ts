import { captureHomeViewPreferences, homeViewKey, resolveHomeViews, HomeViewCandidate } from './home-views';
import { HomeDashboardReference } from './home-dashboard';
import { decodeHomeDashboard, decodeHomeOwnerState } from './home-validation';
import { homeDefinition, homeOwnerState } from './testing/home-fixtures';

describe('built-in Home identities and explicit view preferences', () => {
  const home: HomeDashboardReference = { kind: 'built-in', template: 'home', version: 1 };
  const water: HomeDashboardReference = { kind: 'built-in', template: 'water', version: 1 };
  const saved: HomeDashboardReference = { kind: 'saved', dashboardGuid: 'home' };
  const candidates: HomeViewCandidate[] = [home, water, saved].map(reference => ({ reference, available: true, visible: true }));
  const input = { initialization: 'new' as const, candidates, legacyOrder: [], deletedStarters: [] };
  it('shows released complete defaults read-only only for new owners, with distinct logical and saved identities', () => {
    expect(resolveHomeViews(input).default).toEqual(home);
    expect(homeViewKey(home)).not.toBe(homeViewKey(saved));
    for (const initialization of ['legacy', 'initialized', 'unavailable'] as const)
      expect(resolveHomeViews({ ...input, initialization, candidates: candidates.slice(0, 2) }).entries).toEqual([]);
  });
  it('freezes the available catalog on an explicit choice and preserves hidden/deleted/default intent with visible fallback', () => {
    const preferences = { ...captureHomeViewPreferences(candidates.slice(0, 1), home), hidden: [home] };
    const before = structuredClone(preferences);
    expect(resolveHomeViews({ ...input, preferences }).default).toEqual(saved);
    expect(resolveHomeViews({ ...input, preferences }).entries.map(item => item.reference)).not.toContainEqual(water);
    expect(resolveHomeViews({ ...input, preferences: { ...preferences, hidden: [], deleted: [home] } }).entries.map(item => item.reference)).not.toContainEqual(home);
    expect(preferences).toEqual(before);
    expect(resolveHomeViews({ ...input, candidates: [], preferences }).default).toBeUndefined();
  });
  it('retains unavailable versions, orders and defaults without substituting another recipe version', () => {
    const future = { ...home, version: 9 };
    const preferences = captureHomeViewPreferences([{ reference: future, available: false, visible: true }], future);
    const result = resolveHomeViews({ ...input, preferences, candidates: [...candidates, { reference: future, available: false, visible: true }] });
    expect(result.entries.map(item => item.reference)).toEqual([future, saved]);
    expect(result.default).toEqual(saved);
    expect(decodeHomeOwnerState({ ...homeOwnerState(), views: { ...preferences, version: 9 } }).state).toBe('unsupported');
  });
  it('excludes explicitly deleted saved views and falls back without rewriting their retained default', () => {
    const preferences = { ...captureHomeViewPreferences(candidates, saved), deleted: [saved] };
    const result = resolveHomeViews({ ...input, initialization: 'initialized', preferences });
    expect(result.entries.map(item => item.reference)).not.toContainEqual(saved);
    expect(result.visible.map(item => item.reference)).not.toContainEqual(saved);
    expect(result.default).toEqual(home);
    expect(preferences.default).toEqual(saved);
  });
  it('uses explicit view order when its default is absent rather than reviving the legacy saved default', () => {
    const preferences = captureHomeViewPreferences(candidates);
    expect(resolveHomeViews({ ...input, preferences, legacyDefault: 'home' }).default).toEqual(home);
    expect(resolveHomeViews({ ...input, legacyDefault: 'home' }).default).toEqual(saved);
  });
  it('validates typed chart references and preferences without confusing versions with resource identities', () => {
    const widget = { kind: 'built-in-chart' as const, id: 'widget', size: 'half' as const, visibility: 'always' as const,
      reference: { kind: 'built-in' as const, recipe: 'reporting-rolling-improvement', version: 99, owner: { kind: 'facility' as const, guid: 'facility' } }, inherit: [], overrides: {} };
    expect(decodeHomeDashboard(homeDefinition([widget])).state).toBe('valid');
    expect(decodeHomeDashboard(homeDefinition([{ ...widget, reference: { ...widget.reference, version: 0 } }])).state).toBe('invalid');
    expect(decodeHomeOwnerState({ ...homeOwnerState(), views: captureHomeViewPreferences(candidates) }).state).toBe('valid');
    expect(decodeHomeOwnerState({ ...homeOwnerState(), views: { ...captureHomeViewPreferences(candidates), order: [home, home] } }).state).toBe('invalid');
  });
});
