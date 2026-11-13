import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { AccountAnalysisService } from '@v0/data-evaluation/account/account-analysis/account-analysis.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { CALCULATION_WORKER_TIMEOUT_MS } from '@platform/web-workers/run-worker';
import { AccountAnalysisResultsComponent } from './account-analysis-results.component';

@NgModule({ declarations: [AccountAnalysisResultsComponent], imports: [CommonModule, RouterModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
class AccountResultsTestModule { }

class CalculationWorker {
  static instances: CalculationWorker[] = [];
  readonly listeners = new Map<string, (event: any) => void>();
  readonly terminate = vi.fn();
  readonly postMessage = vi.fn((_payload: any) => {});
  constructor() { CalculationWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: any) => void): void { this.listeners.set(type, listener); }
  respond(data: unknown): void { this.listeners.get('message')?.({ data }); }
  fail(): void { this.listeners.get('error')?.(new Error('Native worker failure')); }
}

function snapshot(): AccountWorkspaceSnapshot {
  return {
    account: { id: 1, guid: 'account-a', fiscalYear: 'calendarYear' }, facilities: [],
    accountAnalyses: [{ id: 1, guid: 'analysis-a', accountId: 'account-a', name: 'Analysis', energyUnit: 'MMBtu', baselineYear: 2020, facilityAnalysisItems: [] }],
    facilityAnalyses: [], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [], savedVisualizations: []
  } as unknown as AccountWorkspaceSnapshot;
}

const response = (year: number) => ({ error: false, annualAnalysisSummaries: [{ year }], monthlyAnalysisSummaryData: [], facilitySummaries: [] });

describe('AccountAnalysisResultsComponent current results', () => {
  let store: AccountWorkspaceStore;
  let results: AccountAnalysisService;
  let component: AccountAnalysisResultsComponent;
  beforeEach(() => {
    CalculationWorker.instances = [];
    vi.stubGlobal('Worker', CalculationWorker);
    store = new AccountWorkspaceStore();
    const saved = snapshot();
    store.publish(saved, { accountAnalysis: saved.accountAnalyses[0] });
    results = new AccountAnalysisService();
    TestBed.configureTestingModule({ imports: [AccountResultsTestModule], providers: [
      AccountAnalysisResultsComponent,
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: AccountAnalysisService, useValue: results },
      { provide: SharedDataService, useValue: { openCreateReportModal: new BehaviorSubject(false) } },
      { provide: AccountStatusCheckService, useValue: { accountStatusCheck: new BehaviorSubject(undefined) } }
    ] });
    component = TestBed.inject(AccountAnalysisResultsComponent);
    component.ngOnInit();
    TestBed.tick();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('cancels superseded calculations and rejects an old response before observable synchronization', () => {
    const old = CalculationWorker.instances[0];
    const updated = { ...store.accountAnalyses()[0], baselineYear: 2022, energyUnit: 'kWh' } as IdbAccountAnalysisItem;
    store.publishCommittedPatch(upsertWorkspaceRecords('accountAnalyses', [updated]));
    old.respond(response(2020));
    expect(results.annualAnalysisSummary.value).toBeUndefined();
    TestBed.tick();
    expect(old.terminate).toHaveBeenCalledOnce();
    const current = CalculationWorker.instances[1];
    expect(current.postMessage.mock.calls[0][0].accountAnalysisItem).toMatchObject({ baselineYear: 2022, energyUnit: 'kWh' });
    old.respond(response(2020));
    current.respond(response(2022));
    expect(results.annualAnalysisSummary.value).toEqual([{ year: 2022 }]);
    expect(results.calculating.value).toBe(false);
  });

  it('recalculates when a legacy numeric reading changes from NaN to null', () => {
    store.publishCommittedPatch(upsertWorkspaceRecords('meterData', [{ guid: 'reading-a', accountId: 'account-a', totalEnergyUse: NaN } as any]));
    TestBed.tick();
    const nonFinite = CalculationWorker.instances.at(-1)!;
    expect(nonFinite.postMessage.mock.calls[0][0].meterData[0].totalEnergyUse).toBeNaN();
    store.publishCommittedPatch(upsertWorkspaceRecords('meterData', [{ guid: 'reading-a', accountId: 'account-a', totalEnergyUse: null } as any]));
    TestBed.tick();
    expect(CalculationWorker.instances).toHaveLength(3);
    expect(nonFinite.terminate).toHaveBeenCalledOnce();
    expect(CalculationWorker.instances[2].postMessage.mock.calls[0][0].meterData[0].totalEnergyUse).toBeNull();
  });

  it('cancels and clears results when inputs become unavailable or the component is destroyed', () => {
    const old = CalculationWorker.instances[0];
    old.respond(response(2020));
    store.beginLoad(false);
    TestBed.tick();
    expect(results.annualAnalysisSummary.value).toBeUndefined();
    store.publish(snapshot(), { accountAnalysis: snapshot().accountAnalyses[0] });
    TestBed.tick();
    const active = CalculationWorker.instances.at(-1)!;
    TestBed.resetTestingModule();
    expect(active.terminate).toHaveBeenCalledOnce();
    active.respond(response(2025));
    expect(results.annualAnalysisSummary.value).toBeUndefined();
  });

  it('handles returned and native errors and retries the current committed request', () => {
    CalculationWorker.instances[0].respond({ error: true });
    expect(results.calculating.value).toBe('error');
    component.retry(); TestBed.tick();
    CalculationWorker.instances[1].fail();
    expect(results.calculating.value).toBe('error');
    const updated = { ...store.accountAnalyses()[0], baselineYear: 2023 } as IdbAccountAnalysisItem;
    store.publishCommittedPatch(upsertWorkspaceRecords('accountAnalyses', [updated]));
    TestBed.tick();
    CalculationWorker.instances[2].respond(response(2023));
    expect(results.annualAnalysisSummary.value).toEqual([{ year: 2023 }]);
  });

  it('turns a timeout or worker construction failure into a retryable error', () => {
    vi.useFakeTimers();
    component.retry(); TestBed.tick();
    const worker = CalculationWorker.instances.at(-1)!;
    vi.advanceTimersByTime(CALCULATION_WORKER_TIMEOUT_MS);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(results.calculating.value).toBe('error');
    vi.stubGlobal('Worker', class { constructor() { throw new Error('Worker unavailable'); } });
    component.retry(); TestBed.tick();
    expect(results.calculating.value).toBe('error');
  });
});
