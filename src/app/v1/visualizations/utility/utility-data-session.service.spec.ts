import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import type { WorkspaceCalendarizationBaseResult } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { UtilityDataSession } from './utility-data-session.service';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import type { UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';

describe('utility preview calculation demand', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup() {
    const store = new AccountWorkspaceStore(), snapshot = visualizationSnapshot(); store.publish({ ...snapshot, meters: [meter({})], facilities: snapshot.facilities.map(facility => ({ ...facility, eGridSubregion: 'US' })) });
    const result = new BehaviorSubject<WorkspaceCalendarizationBaseResult>({ state: 'evaluating', accountGuid: 'account-a', meters: [] });
    const calendar = { calendarizeBase: vi.fn(() => result.asObservable()), currentInputFingerprint: signal('fp'), currentEmissionsRates: signal([]), retry: vi.fn() };
    TestBed.configureTestingModule({ providers: [UtilityDataSession, { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceCalendarizationService, useValue: calendar }] });
    return { data: TestBed.inject(UtilityDataSession), store, calendar, result, identity: { accountGuid: 'account-a', workspaceRevision: store.revision() } };
  }
  it('does not demand calendarization for native observations', async () => {
    const { data, calendar, identity } = setup(), abort = new AbortController();
    expect((await data.acquire(identity, abort.signal, false)).snapshot.account.guid).toBe('account-a');
    expect(calendar.calendarizeBase).not.toHaveBeenCalled(); abort.abort();
  });
  it('shares one demand between date resolution and all providers until cancellation', async () => {
    const { data, calendar, result, identity } = setup(), abort = new AbortController();
    const first = data.acquire(identity, abort.signal, true), second = data.acquire(identity, abort.signal, true);
    expect(first).toBe(second); expect(calendar.calendarizeBase).toHaveBeenCalledTimes(1);
    result.next({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'fp', meters: [] });
    await expect(first).resolves.toMatchObject({ base: { inputFingerprint: 'fp' } });
    expect(result.observed).toBe(true); abort.abort(); expect(result.observed).toBe(false);
  });
  it('rejects canceled or stale requests without publishing late values', async () => {
    const { data, result, identity } = setup(), abort = new AbortController();
    const pending = data.acquire(identity, abort.signal, true);
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' }); abort.abort(); await rejected;
    expect(result.observed).toBe(false);
    await expect(data.acquire({ ...identity, workspaceRevision: identity.workspaceRevision + 1 }, new AbortController().signal, false)).rejects.toThrow('no longer current');
  });
  it('does not reuse a resolved snapshot after the workspace revision changes', async () => {
    const { data, store, identity } = setup(), abort = new AbortController();
    await data.acquire(identity, abort.signal, false);
    store.publishCommitted({ ...store.snapshot()!, account: { ...store.account()!, name: 'Changed owner' } }, {});
    expect(data.isCurrent(identity)).toBe(false);
    await expect(data.acquire(identity, abort.signal, false)).rejects.toThrow('no longer current'); abort.abort();
  });
  it('reuses current canonical results after a presentation-only preview replacement', async () => {
    const { data, calendar, result, identity } = setup(), firstAbort = new AbortController();
    const first = data.acquire(identity, firstAbort.signal, true);
    result.next({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'fp', meters: [] }); await first; firstAbort.abort();
    const nextAbort = new AbortController();
    await expect(data.acquire(identity, nextAbort.signal, true)).resolves.toMatchObject({ base: { inputFingerprint: 'fp' } });
    expect(calendar.calendarizeBase).toHaveBeenCalledTimes(1); nextAbort.abort();
  });
  it('waits for bundled factors only for emissions that need them and cancels without a Worker', async () => {
    const { data, calendar, identity, store } = setup();
    const definition = utilityVisualizationFixture(), source = definition.sources[0] as UtilityVisualizationSource;
    expect(data.requiresGrid([source], definition.scope)).toBe(false);
    expect(data.requiresGrid([{ ...source, measure: 'location-emissions' }], definition.scope)).toBe(true);
    const abort = new AbortController(), pending = data.acquire(identity, abort.signal, true, true);
    expect(calendar.calendarizeBase).not.toHaveBeenCalled();
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' }); abort.abort(); await rejected;
    TestBed.inject(EGridService).setCo2Emissions([]); TestBed.flushEffects();
    expect(calendar.calendarizeBase).not.toHaveBeenCalled();
    store.publishCommitted({ ...store.snapshot()!, meters: store.meters().map(meter => ({ ...meter, source: 'Natural Gas' as const })) }, {});
    expect(data.requiresGrid([{ ...source, measure: 'location-emissions' }], definition.scope)).toBe(false);
  });
  it('releases a shared waiting request after factor readiness and attaches the actual canonical catalog', async () => {
    const { data, calendar, result, identity } = setup(), abort = new AbortController();
    const pending = data.acquire(identity, abort.signal, true, true);
    expect(data.acquire(identity, abort.signal, true, true)).toBe(pending);
    TestBed.inject(EGridService).setCo2Emissions([]); TestBed.flushEffects();
    await Promise.resolve();
    expect(calendar.calendarizeBase).toHaveBeenCalledTimes(1);
    result.next({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'fp', meters: [] });
    await expect(pending).resolves.toMatchObject({ emissionsRates: [] }); abort.abort();
  });
  it('returns native observations with loaded bundled factors without calendarization demand', async () => {
    const { data, calendar, identity } = setup(), abort = new AbortController();
    TestBed.inject(EGridService).setCo2Emissions([{ SUBRGN: 'US', Year: '2023', CATEGORY: 'LocationMix', CO2: '1000', CH4: '0.1', N2O: '0.01' }]);
    const loaded = await data.acquire(identity, abort.signal, false, true);
    expect(loaded.emissionsRates).toEqual([expect.objectContaining({ subregion: 'US', locationEmissionRates: [expect.objectContaining({ CO2: 1000 })] })]);
    expect(calendar.calendarizeBase).not.toHaveBeenCalled(); abort.abort();
  });

});
