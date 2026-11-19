import { decodeHomeDashboard, decodeHomeOwnerState } from './home-validation';
import { presentedHomeOwner, resolveHomeDefault } from './home-dashboard';
import { chartWidget, homeDefinition, homeOwnerState } from './testing/home-fixtures';
import type { HomeWidget } from './home-dashboard';

describe('Home durable intent', () => {
  const base = { id: 'widget', size: 'full' as const, visibility: 'always' as const };
  const variants: HomeWidget[] = [
    { ...base, kind: 'goal', binding: { kind: 'exact', analysisGuid: 'analysis-a' } },
    { ...base, kind: 'goal', binding: { kind: 'reporting', owner: { kind: 'facility', guid: 'facility-a' }, category: 'water' } },
    { ...base, kind: 'actions', settings: { scope: 'owner' } },
    { ...base, kind: 'owner-summary', settings: { scope: 'owner' } },
    { ...base, kind: 'shortcut', destination: { area: 'data', owner: { kind: 'facility', guid: 'facility-a' }, resource: { kind: 'meter', guid: 'meter-a' } } },
    { ...base, kind: 'table', settings: { view: 'facility-progress', measure: 'energy', period: 'latest-result' } },
    { ...base, kind: 'table', settings: { view: 'utility-detail', measure: 'cost', period: 'utility-window' } },
    { ...base, kind: 'table', settings: { view: 'utility-summary', measure: 'water', period: 'all-years' } },
    { ...base, kind: 'table', settings: { view: 'equipment-summary', measure: 'emissions', period: 'latest-equipment-year' } },
    ...(['energy', 'cost', 'water', 'emissions'] as const).map(measure => ({ ...base, kind: 'map' as const, settings: { measure } }))
  ];
  it.each(variants)('round trips the typed $kind widget grammar and rejects unknown executable/settings fields', widget => {
    expect(decodeHomeDashboard(homeDefinition([widget]))).toEqual({ state: 'valid', value: homeDefinition([widget]) });
    expect(decodeHomeDashboard({ ...homeDefinition(), widgets: [{ ...widget, resultRows: [] }] }).state).toBe('invalid');
    if ('settings' in widget) expect(decodeHomeDashboard({ ...homeDefinition(), widgets: [{ ...widget, settings: { ...widget.settings, unknown: true } }] }).state).toBe('invalid');
  });
  it('retains widget reading order, independent settings and explicit inheritance', () => {
    const definition = homeDefinition([chartWidget(), { kind: 'note', id: 'note', size: 'full', visibility: 'always', text: 'Use <plain text>' }]);
    const result = decodeHomeDashboard(definition);
    expect(result).toEqual({ state: 'valid', value: definition });
    if (result.state === 'valid') expect(result.value).not.toBe(definition);
    expect(decodeHomeDashboard({ ...definition, widgets: [chartWidget(), chartWidget()] }).state).toBe('invalid');
    expect(decodeHomeDashboard({ ...definition, widgets: [{ ...chartWidget(), visualizationGuid: 42 }] }).state).toBe('invalid');
  });
  it.each([
    { defaults: { period: { kind: 'fixed', start: '2026-02-30', end: '2026-03-01', basis: 'calendar' } } },
    { defaults: { displaySettings: { units: { energy: { kind: 'pinned', value: 'gal' } } } } },
    { defaults: { facilityGuids: ['other-facility'] } },
    { session: { scroll: 12 } }, { widgets: [{ ...chartWidget(), definition: {} }] },
    { widgets: [{ ...chartWidget(), kind: 'shortcut', destination: { url: 'https://example.com' } }] },
    { widgets: [{ ...chartWidget(), size: 'small' }] }
  ])('rejects malformed, embedded or session-only intent %j', patch => {
    expect(decodeHomeDashboard({ ...homeDefinition(), ...patch }).state).toBe('invalid');
  });
  it('keeps initialized empty sets and rejects duplicate order/deletion identities', () => {
    expect(decodeHomeOwnerState(homeOwnerState())).toEqual({ state: 'valid', value: homeOwnerState() });
    expect(decodeHomeOwnerState({ ...homeOwnerState(), dashboardOrder: ['a', 'a'] }).state).toBe('invalid');
    expect(decodeHomeOwnerState({ ...homeOwnerState(), deletedStarters: ['unknown'] }).state).toBe('invalid');
  });
  it('falls back predictably for deleted/hidden defaults and leaves empty owners empty', () => {
    const state = { ...homeOwnerState(['home', 'water', 'costs']), defaultDashboardGuid: 'water' };
    expect(resolveHomeDefault(state, ['home', 'costs'])).toBe('home');
    expect(resolveHomeDefault(state, [])).toBeUndefined();
    expect(resolveHomeDefault(state, ['costs', 'home', 'water'])).toBe('water');
    expect(state.defaultDashboardGuid).toBe('water');
  });
  it('distinguishes portfolios, valid single-facility presentation and invalid configurations without writes', () => {
    const facility = { guid: 'facility-a', accountId: 'account-a' };
    expect(presentedHomeOwner({ guid: 'account-a' }, [facility])).toEqual({ kind: 'account', guid: 'account-a' });
    expect(presentedHomeOwner({ guid: 'account-a', isSingleFacilityCompany: true }, [facility])).toEqual({ kind: 'facility', guid: facility.guid });
    for (const facilities of [[], [facility, { ...facility, guid: 'facility-b' }]])
      expect(presentedHomeOwner({ guid: 'account-a', isSingleFacilityCompany: true }, facilities)).toBeUndefined();
  });
});
