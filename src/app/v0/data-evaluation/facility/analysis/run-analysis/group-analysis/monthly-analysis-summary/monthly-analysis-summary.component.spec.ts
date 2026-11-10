import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { AnalysisGroup } from '@data/models/analysis';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewAnalysisGroup, getNewIdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { CALCULATION_WORKER_TIMEOUT_MS } from '@platform/web-workers/run-worker';
import { MonthlyAnalysisSummaryComponent } from './monthly-analysis-summary.component';

@NgModule({ imports: [CommonModule], declarations: [MonthlyAnalysisSummaryComponent], schemas: [NO_ERRORS_SCHEMA] })
class SummaryTestModule {}

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  static constructionError = false;
  static postError = false;
  readonly listeners = new Map<string, EventListener>();
  readonly terminate = vi.fn();
  payload: any;
  constructor(readonly url: URL) {
    if (ControlledWorker.constructionError) { throw new Error('construction failed'); }
    ControlledWorker.instances.push(this);
  }
  addEventListener(type: string, listener: EventListener): void { this.listeners.set(type, listener); }
  postMessage(payload: unknown): void {
    if (ControlledWorker.postError) { throw new Error('post failed'); }
    this.payload = structuredClone(payload);
  }
  emit(value: number, year = 2023): void {
    this.listeners.get('message')?.(new MessageEvent('message', {
      data: { error: false, monthlyAnalysisSummary: { monthlyAnalysisSummaryData: [{ year, adjusted: value }], predictorVariables: [] } }
    }));
  }
  fail(): void { this.listeners.get('error')?.(new ErrorEvent('error', { message: 'native worker failure' })); }
  returnedError(): void { this.listeners.get('message')?.(new MessageEvent('message', { data: { error: true } })); }
}

describe('MonthlyAnalysisSummaryComponent committed input lifetime', () => {
  let fixture: ComponentFixture<MonthlyAnalysisSummaryComponent>;
  let component: MonthlyAnalysisSummaryComponent;
  let store: AccountWorkspaceStore;
  let selectedGroup: BehaviorSubject<AnalysisGroup>;
  let snapshot: AccountWorkspaceSnapshot;
  const displays = new Map<string, BehaviorSubject<'table' | 'graph'>>();
  const currentValue = () => component.monthlyAnalysisSummary()?.monthlyAnalysisSummaryData[0]?.adjusted;

  beforeEach(() => {
    ControlledWorker.instances = [];
    ControlledWorker.constructionError = false;
    ControlledWorker.postError = false;
    vi.stubGlobal('Worker', ControlledWorker);
    snapshot = createSnapshot();
    selectedGroup = new BehaviorSubject(snapshot.facilityAnalyses[0].groups[0]);
    displays.clear();
    TestBed.configureTestingModule({
      imports: [SummaryTestModule],
      providers: [
        AccountWorkspaceStore,
        { provide: AnalysisService, useValue: { selectedGroup,
          getDisplaySubject: (key: string, initial: 'table' | 'graph') => {
            if (!displays.has(key)) { displays.set(key, new BehaviorSubject(initial)); }
            return displays.get(key);
          } } },
        { provide: SharedDataService, useValue: { itemsPerPage: new BehaviorSubject(25) } }
      ]
    }).overrideComponent(MonthlyAnalysisSummaryComponent, { set: { template: '<p>{{ calculating() }}</p>' } });
    store = TestBed.inject(AccountWorkspaceStore);
    store.publish(snapshot, { facility: snapshot.facilities[0], facilityAnalysis: snapshot.facilityAnalyses[0] });
    fixture = TestBed.createComponent(MonthlyAnalysisSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function commitConstant(value: number): void {
    const analysis = store.selectedFacilityAnalysis();
    const updated = { ...analysis, groups: analysis.groups.map((group, index) => index ? group : { ...group, regressionConstant: value }) };
    store.publishCommittedPatch({ collections: [{ collection: 'facilityAnalyses', upsert: [updated] }] });
  }

  it('recalculates a delayed coefficient commit after mounting, using the committed group before the selection subject catches up', () => {
    const mountedComponent = fixture.componentInstance;
    const first = ControlledWorker.instances[0];
    first.emit(10);
    expect(currentValue()).toBe(10);
    commitConstant(40);
    // Reject even a response delivered before Angular runs the replacement effect.
    first.emit(999);
    expect(currentValue()).toBe(10);
    fixture.detectChanges();
    const second = ControlledWorker.instances[1];
    expect(fixture.componentInstance).toBe(mountedComponent);
    expect(second.payload.selectedGroup.regressionConstant).toBe(40);
    expect(second.payload.analysisItem.groups[0].regressionConstant).toBe(40);
    expect(component.selectedGroup().regressionConstant).toBe(40);
    expect(component.calculating()).toBe(true);
    second.emit(40);
    expect(currentValue()).toBe(40);
    expect(component.calculating()).toBe(false);
  });

  it('cancels a superseded in-flight job and ignores late messages', () => {
    const first = ControlledWorker.instances[0];
    commitConstant(20);
    first.emit(999);
    expect(currentValue()).toBeUndefined();
    fixture.detectChanges();
    expect(first.terminate).toHaveBeenCalledOnce();
    first.emit(999);
    expect(currentValue()).toBeUndefined();
    ControlledWorker.instances[1].emit(20);
    expect(currentValue()).toBe(20);
  });

  it('restarts an identical request when an intervening commit caused its completed response to be ignored', () => {
    const first = ControlledWorker.instances[0];
    commitConstant(20);
    first.emit(999);
    expect(currentValue()).toBeUndefined();
    expect(component.calculating()).toBe(true);
    expect(first.terminate).toHaveBeenCalledOnce();
    // Both commits land before Angular observes the replacement inputs.
    commitConstant(10);
    fixture.detectChanges();
    expect(ControlledWorker.instances).toHaveLength(2);
    const replacement = ControlledWorker.instances[1];
    expect(replacement.payload.selectedGroup.regressionConstant).toBe(10);
    replacement.emit(10);
    expect(currentValue()).toBe(10);
    expect(component.calculating()).toBe(false);
  });

  it('reuses an unchanged ready result and in-flight request across workspace publications', () => {
    store.publishCommitted(structuredClone(snapshot), store.selections());
    fixture.detectChanges();
    expect(ControlledWorker.instances).toHaveLength(1);
    ControlledWorker.instances[0].emit(10);
    store.publishCommitted(structuredClone(snapshot), store.selections());
    fixture.detectChanges();
    expect(ControlledWorker.instances).toHaveLength(1);
    expect(currentValue()).toBe(10);
  });

  it('recalculates for changed group and units while retaining the saved display setting', () => {
    component.setDataDisplay('table');
    selectedGroup.next(snapshot.facilityAnalyses[0].groups[1]);
    fixture.detectChanges();
    expect(ControlledWorker.instances[1].payload.selectedGroup.idbGroupId).toBe('group-b');
    const analysis = store.selectedFacilityAnalysis();
    const updated = { ...analysis, energyUnit: 'kWh', energyIsSource: true };
    store.publishCommittedPatch({ collections: [{ collection: 'facilityAnalyses', upsert: [updated] }] });
    fixture.detectChanges();
    const job = ControlledWorker.instances[2];
    expect(job.payload.analysisItem).toMatchObject({ energyUnit: 'kWh', energyIsSource: true });
    expect(component.analysisItem().energyUnit).toBe('kWh');
    expect(component.analysisDisplay()).toBe('table');
  });

  it('cancels on workspace replacement and never publishes an old account result into the replacement', () => {
    const old = ControlledWorker.instances[0];
    store.beginLoad(true);
    old.emit(999);
    expect(currentValue()).toBeUndefined();
    fixture.detectChanges();
    expect(old.terminate).toHaveBeenCalledOnce();
    const replacement = createSnapshot('account-b');
    store.publish(replacement, { facility: replacement.facilities[0], facilityAnalysis: replacement.facilityAnalyses[0] });
    selectedGroup.next(replacement.facilityAnalyses[0].groups[0]);
    fixture.detectChanges();
    old.emit(999);
    ControlledWorker.instances[1].emit(30);
    expect(currentValue()).toBe(30);
  });

  it('waits safely for a missing group and calculates when a valid group is selected', () => {
    selectedGroup.next({ idbGroupId: 'missing' } as AnalysisGroup);
    fixture.detectChanges();
    expect(component.calculating()).toBe(false);
    expect(currentValue()).toBeUndefined();
    selectedGroup.next(snapshot.facilityAnalyses[0].groups[1]);
    fixture.detectChanges();
    expect(ControlledWorker.instances[1].payload.selectedGroup.idbGroupId).toBe('group-b');
  });

  it.each(['native', 'returned', 'construction', 'post', 'timeout'])('shows %s failure, terminates the job, and retries current inputs', failure => {
    const first = ControlledWorker.instances[0];
    if (failure === 'native') { first.fail(); }
    if (failure === 'returned') { first.returnedError(); }
    if (failure === 'construction' || failure === 'post') {
      ControlledWorker.constructionError = failure === 'construction';
      ControlledWorker.postError = failure === 'post';
      component.retryCalculation();
    }
    if (failure === 'timeout') {
      vi.useFakeTimers();
      component.retryCalculation();
      vi.advanceTimersByTime(CALCULATION_WORKER_TIMEOUT_MS);
    }
    expect(component.calculating()).toBe('error');
    const failed = ControlledWorker.instances.at(-1);
    expect(failed.terminate).toHaveBeenCalledOnce();
    commitConstant(50);
    ControlledWorker.constructionError = false;
    ControlledWorker.postError = false;
    component.retryCalculation();
    const retried = ControlledWorker.instances.at(-1);
    expect(retried.payload.selectedGroup.regressionConstant).toBe(50);
    retried.emit(50);
    expect(currentValue()).toBe(50);
    expect(component.calculating()).toBe(false);
  });

  it('terminates its active request on destruction and ignores late responses', () => {
    const first = ControlledWorker.instances[0];
    fixture.destroy();
    first.emit(999);
    expect(first.terminate).toHaveBeenCalledOnce();
    expect(currentValue()).toBeUndefined();
  });
});

function createSnapshot(accountGuid = 'account-a'): AccountWorkspaceSnapshot {
  const account = { ...getNewIdbAccount(), guid: accountGuid };
  const facility = { ...getNewIdbFacility(account), id: 1, guid: accountGuid + '-facility' };
  const analysis = { ...getNewIdbAnalysisItem(account, facility, [], [], 'energy'), id: 1, guid: accountGuid + '-analysis',
    groups: ['group-a', 'group-b'].map(id => ({ ...getNewAnalysisGroup(id, []), regressionConstant: 10 })) };
  return { account, facilities: [facility], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [analysis], accountAnalyses: [], accountReports: [], facilityReports: [], customEmissions: [],
    customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [] };
}
