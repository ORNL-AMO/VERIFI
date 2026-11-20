import { homeDisplayRaw, homeDisplayDraft } from './display-controls.component';
describe('typed Home display draft', () => {
  it('retains unsupported period and quantity choices while changing an unrelated field', () => {
    const defaults = { period: { kind: 'fiscal-year' as const, year: 2025 }, displaySettings: { units: { mass: { kind: 'pinned' as const, value: 'kg' } } } };
    const raw = homeDisplayRaw(defaults); const draft = homeDisplayDraft({ ...raw, emissionsTreatment: 'location' }, defaults);
    expect(draft.value).toEqual({ ...defaults, emissionsTreatment: 'location' });
  });
  it('preserves exact retained civil bounds during unrelated edits', () => {
    const value = { period: { kind: 'fixed' as const, start: '2024-01-15', end: '2024-03-20', basis: 'calendar' as const } };
    expect(homeDisplayDraft({ ...homeDisplayRaw(value), energy: 'MMBtu' }, value).value.period).toEqual(value.period);
  });
  it('keeps incomplete/reversed dates invalid and uses inclusive whole-month civil bounds', () => {
    const raw = homeDisplayRaw({});
    expect(homeDisplayDraft({ ...raw, period: 'fixed', start: '2024-03', end: '2024-02' }, {}).valid).toBe(false);
    expect(homeDisplayDraft({ ...raw, period: 'fixed', start: '', end: '2024-02' }, {}).valid).toBe(false);
    expect(homeDisplayDraft({ ...raw, period: 'fixed', start: '2024-02', end: '2024-02' }, {}).value.period).toEqual({ kind: 'fixed', start: '2024-02-01', end: '2024-02-29', basis: 'calendar' });
  });
});
