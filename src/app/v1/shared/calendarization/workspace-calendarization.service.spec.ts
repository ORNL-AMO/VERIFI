import { SubregionEmissions } from '@data/models/eGridEmissions';
import { getNewAccountEmissionsItem } from '@data/models/idbModels/customEmissions';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { account, facility, meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { Subscription } from 'rxjs';
import { WorkspaceCalendarizationBaseResult } from './workspace-calendarization.models';
import { WorkspaceCalendarizationService } from './workspace-calendarization.service';

describe('WorkspaceCalendarizationService synchronous fallback', () => {
  let originalWorker: typeof Worker;
  let subscription: Subscription | undefined;
  let builtin: WritableSignal<readonly SubregionEmissions[] | undefined>;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    globalThis.Worker = undefined as unknown as typeof Worker;
    builtin = signal<readonly SubregionEmissions[] | undefined>(undefined);
    TestBed.configureTestingModule({ providers: [{ provide: EGridService, useValue: { builtinEmissions: builtin,
      co2Emissions: [{ subregion: 'STALE-LEGACY-ACCOUNT', locationEmissionRates: [], residualEmissionRates: [] }] } }] });
  });

  afterEach(() => {
    subscription?.unsubscribe();
    globalThis.Worker = originalWorker;
    TestBed.resetTestingModule();
  });

  it('calculates one canonical base and projects facility display settings on demand', () => {
    const snapshot = workspaceSnapshot();
    const snapshotState = signal(snapshot);
    TestBed.configureTestingModule({ providers: [WorkspaceCalendarizationService, {
      provide: AccountWorkspaceStore,
      useValue: { snapshot: snapshotState, isReady: signal(true) }
    }] });
    const service = TestBed.inject(WorkspaceCalendarizationService);
    let latest: WorkspaceCalendarizationBaseResult | undefined;
    subscription = service.calendarizeBase().subscribe(result => latest = result);
    TestBed.flushEffects();

    expect(latest?.state).toBe('ready');
    expect(latest?.meters[0].energyUnit).toBe('MMBtu');
    expect(latest?.meters[0].energyIsSource).toBe(false);
    const projected = service.project(latest as WorkspaceCalendarizationBaseResult, {
      context: { kind: 'facility', guid: 'facility-a' }, includeEmissions: false
    });
    expect(projected.state).toBe('ready');
    expect(projected.meters[0].energyUnit).toBe('GJ');
    expect(projected.meters[0].monthlyData[0].energyUse).toBeCloseTo(0.36, 8);
    expect(snapshot.meterData[0].totalEnergyUse).toBe(100);
  });

  it('recomputes active demand when bundled rates load and reuses unchanged catalogs', () => {
    const snapshotState = signal(workspaceSnapshot());
    TestBed.configureTestingModule({ providers: [WorkspaceCalendarizationService, {
      provide: AccountWorkspaceStore, useValue: { snapshot: snapshotState, isReady: signal(true) }
    }] });
    const service = TestBed.inject(WorkspaceCalendarizationService), results: WorkspaceCalendarizationBaseResult[] = [];
    subscription = service.calendarizeBase().subscribe(result => results.push(result)); TestBed.flushEffects();
    const original = results.filter(result => result.state === 'ready').at(-1)!;
    const rates: SubregionEmissions[] = [{ subregion: 'REGION', locationEmissionRates: [{ year: 2025, CO2: 10, CH4: 0, N2O: 0 }], residualEmissionRates: [] }];
    builtin.set(rates); TestBed.flushEffects();
    const loaded = results.filter(result => result.state === 'ready');
    expect(loaded).toHaveLength(2); expect(loaded[1].inputFingerprint).not.toBe(original.inputFingerprint);
    expect(service.currentEmissionsRates()).toEqual(rates);
    builtin.set(structuredClone(rates)); TestBed.flushEffects();
    expect(results.filter(result => result.state === 'ready')).toHaveLength(2);
    const changed = structuredClone(rates); changed[0].locationEmissionRates[0].CO2 = 11;
    builtin.set(changed); TestBed.flushEffects();
    expect(results.filter(result => result.state === 'ready')).toHaveLength(3);
    expect(service.project(original, { context: { kind: 'facility', guid: 'facility-a' }, includeEmissions: true }).state).toBe('error');
  });

  it('uses bundled rates with the current account snapshot and never a stale legacy combined catalog', () => {
    const customA = { ...getNewAccountEmissionsItem('account-a'), subregion: 'CUSTOM-A' };
    const customB = { ...getNewAccountEmissionsItem('account-b'), subregion: 'CUSTOM-B' };
    const first = { ...workspaceSnapshot(), customEmissions: [customA] }, snapshotState = signal(first);
    const rates: SubregionEmissions[] = [{ subregion: 'BUNDLED', locationEmissionRates: [], residualEmissionRates: [] }];
    builtin.set(rates);
    TestBed.configureTestingModule({ providers: [WorkspaceCalendarizationService, {
      provide: AccountWorkspaceStore, useValue: { snapshot: snapshotState, isReady: signal(true) }
    }] });
    const service = TestBed.inject(WorkspaceCalendarizationService);
    subscription = service.calendarizeBase().subscribe(); TestBed.flushEffects();
    expect(service.currentEmissionsRates().map(item => item.subregion)).toEqual(['BUNDLED', 'CUSTOM-A']);
    snapshotState.set({ ...first, account: { ...first.account, guid: 'account-b' }, customEmissions: [customB] }); TestBed.flushEffects();
    expect(service.currentEmissionsRates().map(item => item.subregion)).toEqual(['BUNDLED', 'CUSTOM-B']);
    expect(first.customEmissions).toEqual([customA]);
  });

  it('rejects a retained base result after calendarization inputs change', () => {
    const snapshotState = signal(workspaceSnapshot());
    TestBed.configureTestingModule({ providers: [WorkspaceCalendarizationService, {
      provide: AccountWorkspaceStore,
      useValue: { snapshot: snapshotState, isReady: signal(true) }
    }] });
    const service = TestBed.inject(WorkspaceCalendarizationService);
    let latest: WorkspaceCalendarizationBaseResult | undefined;
    subscription = service.calendarizeBase().subscribe(result => latest = result);
    TestBed.flushEffects();
    const retainedBase = latest as WorkspaceCalendarizationBaseResult;

    const changed = workspaceSnapshot();
    changed.meterData[0] = { ...changed.meterData[0], totalEnergyUse: 200 };
    snapshotState.set(changed);
    TestBed.flushEffects();

    const projected = service.project(retainedBase, {
      context: { kind: 'facility', guid: 'facility-a' }, includeEmissions: false
    });
    expect(projected.state).toBe('error');
    expect(projected.error).toEqual({
      code: 'invalid-projection',
      message: 'Canonical calendarization is stale for the current workspace inputs.'
    });
  });
});

function workspaceSnapshot() {
  const accountValue = account({ guid: 'account-a', assessmentReportVersion: 'AR6' });
  const facilityValue = facility({
    guid: 'facility-a', accountId: 'account-a', energyUnit: 'GJ', volumeLiquidUnit: 'kgal',
    volumeGasUnit: 'CCF', massUnit: 'kg', energyIsSource: false
  });
  const meterValue = meter({
    guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', source: 'Electricity',
    startingUnit: 'kWh', energyUnit: 'kWh', meterReadingDataApplication: 'fullMonth'
  });
  return {
    account: accountValue, facilities: [facilityValue], meters: [meterValue],
    meterData: [reading({ accountId: 'account-a', facilityId: 'facility-a', meterId: 'meter-a', totalEnergyUse: 100 })],
    meterGroups: [], predictors: [], predictorData: [], facilityAnalyses: [], accountAnalyses: [], accountReports: [],
    facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}
