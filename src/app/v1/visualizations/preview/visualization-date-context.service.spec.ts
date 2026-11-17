import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import type { VisualizationSourceRequest } from '@domain/visualizations/visualization-source-provider';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { UtilitySourceProvider } from '../utility/utility-source-provider.service';
import { VisualizationDateContextResolver } from './visualization-date-context.service';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';

describe('shared utility latest-data anchor', () => {
  it('keeps invalid-reading explanations when no category has a usable latest-data anchor', async () => {
    const { store, dates, resolve, definition } = setup();
    const predictor = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'p' };
    store.publish({ ...store.snapshot()!, predictors: [predictor], predictorData: [{ ...getNewIdbPredictorData(predictor), guid: 'invalid', year: 2026, month: 13, amount: 7 }] });
    resolve.mockResolvedValue({ identity: {} as never, state: 'empty', message: 'No meter history.', periods: [], reasons: ['No meter readings.'] } as never);
    const mixed: VisualizationDefinition = { ...definition, sources: [...definition.sources, { id: 'p', kind: 'predictor', measure: 'value', aggregation: 'none', selection: { kind: 'rule', resource: 'predictor', filter: {} } }] };
    const result = await dates.resolve(mixed, { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: 'saved', definitionRevision: 1 }, new AbortController().signal);
    expect(result.latestDataDate).toBeUndefined();
    expect(result.emptyReasons).toEqual(expect.arrayContaining(['No meter readings.', expect.stringContaining('invalid: 7')]));
  });
  it('shares the newest eligible anchor from either category and preserves whole contained fixed months', async () => {
    const { store, dates, data, resolve, definition } = setup();
    const predictor = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'p' };
    store.publish({ ...store.snapshot()!, predictors: [predictor], predictorData: [{ ...getNewIdbPredictorData(predictor), year: 2026, month: 4, amount: 0, weatherDataWarning: true }] });
    const mixed: VisualizationDefinition = { ...definition, period: { kind: 'rolling', count: 2, unit: 'month', basis: 'calendar', anchor: 'latest-data', includeIncomplete: false },
      sources: [...definition.sources, { id: 'predictor', kind: 'predictor', measure: 'value', aggregation: 'none', selection: { kind: 'rule', resource: 'predictor', filter: {} } }] };
    const identity = { accountGuid: 'account-a', workspaceRevision: store.revision(), definitionGuid: 'saved', definitionRevision: 1 };
    resolve.mockResolvedValue({ identity: {} as never, state: 'ready', resolved: { periods: [{ start: '2025-01-01', end: '2026-06-30' }], data: { kind: 'time-series', rows: [{ end: '2026-02-28', values: { x: { state: 'observed', value: 0 } } }] } } } as never);
    expect(await dates.resolve(mixed, identity, new AbortController().signal)).toMatchObject({ latestDataDate: '2026-04-30', monthlyRange: { start: '2026-03-01', end: '2026-04-30' } });
    const fixed = await dates.resolve({ ...mixed, period: { kind: 'fixed', basis: 'calendar', start: '2024-01-15', end: '2024-03-20' } }, identity, new AbortController().signal);
    expect(fixed.monthlyRange).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    resolve.mockResolvedValue({ identity: {} as never, state: 'ready', resolved: { periods: [{ start: '2025-01-01', end: '2026-06-30' }], data: { kind: 'time-series', rows: [{ end: '2026-06-30', values: { x: { state: 'observed', value: 5 } } }] } } } as never);
    expect((await dates.resolve(mixed, identity, new AbortController().signal)).latestDataDate).toBe('2026-06-30');
    const all = await dates.resolve({ ...mixed, period: { kind: 'all-history' } }, identity, new AbortController().signal);
    expect(all.monthlyRange).toEqual({ start: '2025-01-01', end: '2026-06-30' });
    const calls = data.acquire.mock.calls.length;
    await dates.resolve({ ...mixed, sources: [mixed.sources[1]] }, identity, new AbortController().signal);
    expect(data.acquire.mock.calls).toHaveLength(calls);
  });
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    const store = new AccountWorkspaceStore(), snapshot = visualizationSnapshot();
    store.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b' }] });
    const data = { requiresGrid: vi.fn(() => false), acquire: vi.fn(async () => ({})), isCurrent: vi.fn(() => true) };
    const resolve = vi.fn(async (request: VisualizationSourceRequest) => ({ identity: request.identity, state: 'ready', resolved: { data: { kind: 'time-series', rows: [
      { end: '2026-01-31', values: { first: { state: 'observed', value: 0, provenance: 'measured', partial: false } } },
      { end: '2026-02-28', values: { first: { state: 'missing', value: null, reason: 'Invalid saved inputs.' } } },
      { end: '2026-03-31', values: { first: { state: 'excluded', value: null, reason: 'Retired.' } } }
    ] } } }));
    TestBed.configureTestingModule({ providers: [VisualizationDateContextResolver, { provide: AccountWorkspaceStore, useValue: store }, { provide: UtilityDataSession, useValue: data }, { provide: UtilitySourceProvider, useValue: { resolve } }] });
    const definition = { ...utilityVisualizationFixture(), period: { kind: 'rolling' as const, count: 12, unit: 'month' as const, anchor: 'latest-data' as const, basis: 'calendar' as const, includeIncomplete: true } };
    const identity = { accountGuid: definition.accountGuid, workspaceRevision: store.revision(), definitionGuid: 'saved', definitionRevision: 1 };
    return { data, resolve, definition, identity, store, dates: TestBed.inject(VisualizationDateContextResolver) };
  }
  it('anchors to provider-validated observations, retaining real zero and skipping invalid or retired rows', async () => {
    const { dates, data, resolve, definition, identity } = setup();
    const abort = new AbortController();
    expect((await dates.resolve(definition, identity, abort.signal)).latestDataDate).toBe('2026-01-31');
    expect(data.acquire).toHaveBeenCalledWith(identity, abort.signal, true, false);
    expect(resolve.mock.calls[0][0]).toMatchObject({ period: { kind: 'all-history' }, comparison: { kind: 'none' }, chart: { interval: 'monthly' } });
  });
  it.each<NonNullable<VisualizationDefinition['chart']>>([
    { kind: 'scatter', interval: 'yearly', showFit: true },
    { kind: 'correlation', interval: 'yearly', statistic: 'r', scale: 'raw' },
    { kind: 'heatmap', interval: 'yearly', dimension: 'series-period', scale: 'linear' }
  ])('discovers the actual latest observed month for yearly $kind rolling anchors', async chart => {
    const { dates, resolve, definition, identity } = setup();
    const result = await dates.resolve({ ...definition, chart,
      period: { kind: 'rolling', count: 2, unit: 'year', anchor: 'latest-data', basis: 'calendar', includeIncomplete: true }
    }, identity, new AbortController().signal);
    expect(result.latestDataDate).toBe('2026-01-31');
    expect(result.monthlyRange).toBeUndefined();
    expect(resolve.mock.calls[0][0]).toMatchObject({ period: { kind: 'all-history' }, chart: { kind: 'time-series', interval: 'monthly' } });
  });
  it('does not resolve history for a calendar anchor and rejects superseded date work', async () => {
    const { dates, data, resolve, definition, identity } = setup();
    await dates.resolve({ ...definition, period: { ...definition.period, anchor: 'calendar' } }, identity, new AbortController().signal);
    expect(resolve).not.toHaveBeenCalled();
    data.isCurrent.mockReturnValue(false);
    await expect(dates.resolve(definition, identity, new AbortController().signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('uses the same included-facility boundary for latest-data discovery and provider requests', async () => {
    const { dates, resolve, definition, identity } = setup();
    const selected = { ...definition, facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-a'] } };
    await dates.resolve(selected, identity, new AbortController().signal);
    expect(resolve.mock.calls[0][0].identity.scope).toEqual({ kind: 'facility', facilityGuid: 'facility-a', facilityGuids: ['facility-a'] });
  });

});
