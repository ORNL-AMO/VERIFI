import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { UtilityDateContextResolver } from '../utility/utility-date-context.service';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { UtilitySourceProvider } from '../utility/utility-source-provider.service';
import { PredictorSourceProvider } from './predictor-source-provider.service';

describe('predictor preview snapshot boundary', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('resolves saved predictor dates without meter demand and rejects changed or canceled snapshot requests', async () => {
    const store = new AccountWorkspaceStore();
    const predictor = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'predictor' };
    const reading = { ...getNewIdbPredictorData(predictor), year: 2024, month: 2, amount: 0 };
    store.publish({ ...visualizationSnapshot(), predictors: [predictor], predictorData: [reading] });
    const acquire = vi.fn(), meterResolve = vi.fn();
    TestBed.configureTestingModule({ providers: [PredictorSourceProvider, UtilityDateContextResolver,
      { provide: AccountWorkspaceStore, useValue: store }, { provide: UtilityDataSession, useValue: { acquire } },
      { provide: UtilitySourceProvider, useValue: { resolve: meterResolve } }] });
    const initial = createVisualizationDefinition('Predictor', 'account-a', { kind: 'all' }, 'predictor');
    const source = { ...initial.sources[0], kind: 'predictor' as const, measure: 'value' as const, aggregation: 'none' as const,
      selection: { kind: 'fixed' as const, resource: 'predictor' as const, guids: [predictor.guid] } };
    const definition = { ...initial, sources: [source] };
    const identity = { accountGuid: 'account-a', definitionGuid: 'saved', workspaceRevision: store.revision(), definitionRevision: 1 };
    const abort = new AbortController(), dates = TestBed.inject(UtilityDateContextResolver);
    expect(await dates.resolve(definition, identity, abort.signal)).toMatchObject({ monthlyRange: { start: '2024-02-01', end: '2024-02-29' } });
    expect((await dates.resolve({ ...definition, period: { kind: 'rolling', basis: 'calendar', count: 1, unit: 'month',
      anchor: 'latest-data', includeIncomplete: false } }, identity, abort.signal)).latestDataDate).toBe('2024-02-29');
    expect(acquire).not.toHaveBeenCalled(); expect(meterResolve).not.toHaveBeenCalled();
    const provider = TestBed.inject(PredictorSourceProvider);
    const request = { identity: { ...identity, sourceId: source.id, requestId: 'test', scope: { kind: 'facility' as const, facilityGuid: 'facility-a', facilityGuids: ['facility-a'] } },
      source, chart: { kind: 'time-series' as const, defaultTraceType: 'line' as const, interval: 'monthly' as const, stack: 'none' as const },
      series: [], period: definition.period, comparison: definition.comparison, dateContext: { calendarDate: '2026-11-13' } };
    expect((await provider.resolve(request, abort.signal)).state).toBe('ready');
    store.beginLoad(true); expect((await provider.resolve(request, abort.signal)).state).toBe('error');
    store.publish({ ...visualizationSnapshot(), predictors: [predictor], predictorData: [reading] });
    abort.abort(); expect((await provider.resolve(request, abort.signal)).state).toBe('error');
    store.publishCommitted(visualizationSnapshot(), {});
    expect((await provider.resolve(request, new AbortController().signal)).state).toBe('error');
    store.publish({ ...visualizationSnapshot(), account: { ...visualizationSnapshot().account, guid: 'other-account' } });
    expect((await provider.resolve(request, new AbortController().signal)).state).toBe('error');
  });
});
