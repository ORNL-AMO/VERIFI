import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import type { VisualizationSourceRequest } from '@domain/visualizations/visualization-source-provider';
import { UtilityDataSession } from './utility-data-session.service';
import { UtilitySourceProvider } from './utility-source-provider.service';
import { UtilityDateContextResolver } from './utility-date-context.service';

describe('shared utility latest-data anchor', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    const data = { requiresGrid: vi.fn(() => false), acquire: vi.fn(async () => ({})), isCurrent: vi.fn(() => true) };
    const resolve = vi.fn(async (request: VisualizationSourceRequest) => ({ identity: request.identity, state: 'ready', resolved: { data: { kind: 'time-series', rows: [
      { end: '2026-01-31', values: { first: { state: 'observed', value: 0, provenance: 'measured', partial: false } } },
      { end: '2026-02-28', values: { first: { state: 'missing', value: null, reason: 'Invalid saved inputs.' } } },
      { end: '2026-03-31', values: { first: { state: 'excluded', value: null, reason: 'Retired.' } } }
    ] } } }));
    TestBed.configureTestingModule({ providers: [UtilityDateContextResolver, { provide: UtilityDataSession, useValue: data }, { provide: UtilitySourceProvider, useValue: { resolve } }] });
    const definition = { ...utilityVisualizationFixture(), period: { kind: 'rolling' as const, count: 12, unit: 'month' as const, anchor: 'latest-data' as const, basis: 'calendar' as const, includeIncomplete: true } };
    const identity = { accountGuid: definition.accountGuid, workspaceRevision: 1, definitionGuid: 'saved', definitionRevision: 1 };
    return { data, resolve, definition, identity, dates: TestBed.inject(UtilityDateContextResolver) };
  }
  it('anchors to provider-validated observations, retaining real zero and skipping invalid or retired rows', async () => {
    const { dates, data, resolve, definition, identity } = setup();
    const abort = new AbortController();
    expect((await dates.resolve(definition, identity, abort.signal)).latestDataDate).toBe('2026-01-31');
    expect(data.acquire).toHaveBeenCalledWith(identity, abort.signal, true, false);
    expect(resolve.mock.calls[0][0]).toMatchObject({ period: { kind: 'all-history' }, comparison: { kind: 'none' }, chart: { interval: 'monthly' } });
  });
  it('does not resolve history for a calendar anchor and rejects superseded date work', async () => {
    const { dates, data, resolve, definition, identity } = setup();
    await dates.resolve({ ...definition, period: { ...definition.period, anchor: 'calendar' } }, identity, new AbortController().signal);
    expect(resolve).not.toHaveBeenCalled();
    data.isCurrent.mockReturnValue(false);
    await expect(dates.resolve(definition, identity, new AbortController().signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
