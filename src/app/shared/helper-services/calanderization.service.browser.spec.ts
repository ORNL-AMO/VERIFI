import { TestBed } from '@angular/core/testing';
import { firstValueFrom, filter, take, map } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CalanderizationService } from './calanderization.service';

describe('Calendarization request reuse in Chromium', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('reuses native Worker results for analysis edits and recalculates changed account settings', async () => {
    const NativeWorker = globalThis.Worker;
    let starts = 0;
    class CountingWorker extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        // Angular emits the Worker at the bundle root; Vitest rebases the service's
        // import.meta.url to its original source directory instead of the emitted bundle.
        const emittedAsset = new URL(new URL(String(url)).pathname.split('/').pop()!, location.origin + '/');
        super(emittedAsset, options);
        starts++;
      }
    }
    vi.stubGlobal('Worker', CountingWorker);
    TestBed.configureTestingModule({ providers: [AccountWorkspaceStore, CalanderizationService] });
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(CalanderizationService);
    const ready = () => firstValueFrom(service.calendarizationState.pipe(
      filter(state => state.status === 'ready' || state.status === 'error'), take(1),
      map(state => {
        if (state.status !== 'ready') throw new Error('Native calendarization request failed');
        return state;
      })
    ));
    store.publish({
      account: { guid: 'account-a', energyUnit: 'MMBtu', assessmentReportVersion: 'AR6' },
      facilities: [], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
      facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
      customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [], savedVisualizations: []
    } as any);
    TestBed.flushEffects();
    expect(starts).toBe(1);
    const original = await ready();
    expect(starts).toBe(1);
    store.publishCommittedPatch({ collections: [{ collection: 'facilityAnalyses', upsert: [{ guid: 'analysis-a', accountId: 'account-a' }] }] });
    TestBed.flushEffects();
    const reused = await ready();
    expect(starts).toBe(1);
    expect(reused.calanderizedMeters).toBe(original.calanderizedMeters);
    expect(reused.workspaceSnapshot).toBe(store.snapshot());
    store.publishCommittedPatch({ account: { ...store.account(), energyUnit: 'kWh' } as any });
    TestBed.flushEffects();
    await ready();
    expect(starts).toBe(2);
    expect(service.isReadyForCurrentWorkspace()).toBe(true);
  });
});
