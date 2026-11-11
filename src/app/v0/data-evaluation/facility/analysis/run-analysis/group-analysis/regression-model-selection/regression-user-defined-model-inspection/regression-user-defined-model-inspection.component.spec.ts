import { CommonModule } from '@angular/common';
import { ElementRef, NgModule, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { PlotlyService } from 'angular-plotly.js';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { getNewAnalysisGroup, IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { CALCULATION_WORKER_TIMEOUT_MS } from '@platform/web-workers/run-worker';
import { RegressionUserDefinedModelInspectionComponent } from './regression-user-defined-model-inspection.component';

@Pipe({ name: 'customNumber', standalone: true })
export class InspectionNumberPipe implements PipeTransform { transform(value: unknown): unknown { return value; } }
@NgModule({ declarations: [RegressionUserDefinedModelInspectionComponent], imports: [CommonModule, InspectionNumberPipe] })
class InspectionTestModule { }

class InspectionWorker {
  static instances: InspectionWorker[] = [];
  readonly listeners = new Map<string, (event: any) => void>();
  readonly terminate = vi.fn();
  readonly postMessage = vi.fn((_payload: any) => {});
  constructor() { InspectionWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: any) => void): void { this.listeners.set(type, listener); }
  respond(data: unknown): void { this.listeners.get('message')?.({ data }); }
  fail(): void { this.listeners.get('error')?.(new Error('Native failure')); }
}

const response = (modeledEnergy: number) => ({ error: false, chartData: [{ modeledEnergy }] });
function fixture(): AccountWorkspaceSnapshot {
  const group = {
    ...getNewAnalysisGroup('group-a', [{ id: 'predictor-a', name: 'Production', unit: 'tons', production: true, productionInAnalysis: true, regressionCoefficient: 2 }]),
    isGeneratedModel: false, regressionConstant: 1, regressionStartYear: 2024, regressionModelStartMonth: 0,
    regressionEndYear: 2024, regressionModelEndMonth: 11, regressionModelNotes: 'Notes'
  };
  return {
    account: { id: 1, guid: 'account-a', assessmentReportVersion: 'AR6' },
    facilities: [{ id: 1, guid: 'facility-a', accountId: 'account-a' }],
    facilityAnalyses: [{ id: 1, guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', energyUnit: 'MMBtu', waterUnit: 'gal', groups: [group] }],
    accountAnalyses: [], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [], savedVisualizations: []
  } as unknown as AccountWorkspaceSnapshot;
}

describe('RegressionUserDefinedModelInspectionComponent input lifetime', () => {
  let store: AccountWorkspaceStore;
  let component: RegressionUserDefinedModelInspectionComponent;
  beforeEach(() => {
    InspectionWorker.instances = [];
    vi.stubGlobal('Worker', InspectionWorker);
    store = new AccountWorkspaceStore();
    const saved = fixture();
    store.publish(saved, { facility: saved.facilities[0], facilityAnalysis: saved.facilityAnalyses[0] });
    TestBed.configureTestingModule({ imports: [InspectionTestModule], providers: [
      RegressionUserDefinedModelInspectionComponent,
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: AnalysisService, useValue: { selectedGroup: new BehaviorSubject(saved.facilityAnalyses[0].groups[0]) } },
      { provide: PlotlyService, useValue: { newPlot: vi.fn() } },
      { provide: RegressionModelsService, useValue: { getUserDefinedModel: vi.fn() } },
      { provide: CalanderizationService, useValue: { calanderizedMeters: new BehaviorSubject([]), calendarizationState: new BehaviorSubject({ status: 'idle' }), isReadyForCurrentWorkspace: () => false } }
    ] });
    component = TestBed.inject(RegressionUserDefinedModelInspectionComponent);
    TestBed.tick();
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  function update(changes: Partial<IdbAnalysisItem>): void {
    store.publishCommittedPatch(upsertWorkspaceRecords('facilityAnalyses', [{ ...store.facilityAnalyses()[0], ...changes } as IdbAnalysisItem]));
  }

  it('retains an in-flight calculation through notes and save metadata publications', () => {
    const item = store.facilityAnalyses()[0];
    update({ modifiedDate: new Date(), isAnalysisVisited: false, checked: true,
      groups: [{ ...item.groups[0], regressionModelNotes: 'Updated notes' }] });
    TestBed.tick();
    expect(InspectionWorker.instances).toHaveLength(1);
    InspectionWorker.instances[0].respond(response(12));
    expect(component.inspectedMonthlyAnalysisSummaryData()).toEqual([{ modeledEnergy: 12 }]);
  });

  it('uses the current committed group, cancels changed coefficients and rejects late responses', () => {
    const old = InspectionWorker.instances[0];
    const item = store.facilityAnalyses()[0];
    update({ groups: [{ ...item.groups[0], regressionConstant: 8 }] });
    old.respond(response(1));
    expect(component.inspectedMonthlyAnalysisSummaryData()).toBeUndefined();
    TestBed.tick();
    const current = InspectionWorker.instances[1];
    expect(current.postMessage.mock.calls[0][0].selectedGroup.regressionConstant).toBe(8);
    expect(old.terminate).toHaveBeenCalledOnce();
    current.respond(response(8));
    old.respond(response(1));
    expect(component.inspectedMonthlyAnalysisSummaryData()).toEqual([{ modeledEnergy: 8 }]);
  });

  it('recalculates when a legacy numeric reading changes from NaN to null', () => {
    store.publishCommittedPatch(upsertWorkspaceRecords('meterData', [{ guid: 'reading-a', accountId: 'account-a', facilityId: 'facility-a', totalEnergyUse: NaN } as any]));
    TestBed.tick();
    const nonFinite = InspectionWorker.instances.at(-1)!;
    expect(nonFinite.postMessage.mock.calls[0][0].meterData[0].totalEnergyUse).toBeNaN();
    store.publishCommittedPatch(upsertWorkspaceRecords('meterData', [{ guid: 'reading-a', accountId: 'account-a', facilityId: 'facility-a', totalEnergyUse: null } as any]));
    TestBed.tick();
    expect(InspectionWorker.instances).toHaveLength(3);
    expect(nonFinite.terminate).toHaveBeenCalledOnce();
    expect(InspectionWorker.instances[2].postMessage.mock.calls[0][0].meterData[0].totalEnergyUse).toBeNull();
  });

  it('cancels incomplete and unavailable inputs and terminates work on destroy', () => {
    const old = InspectionWorker.instances[0];
    const item = store.facilityAnalyses()[0];
    update({ groups: [{ ...item.groups[0], regressionConstant: undefined }] });
    TestBed.tick();
    expect(old.terminate).toHaveBeenCalledOnce();
    expect(component.calculating()).toBe(false);
    update({ groups: item.groups }); TestBed.tick();
    const active = InspectionWorker.instances.at(-1)!;
    store.beginLoad(false); TestBed.tick();
    expect(active.terminate).toHaveBeenCalledOnce();
    const saved = fixture();
    store.publish(saved, { facility: saved.facilities[0], facilityAnalysis: saved.facilityAnalyses[0] }); TestBed.tick();
    const last = InspectionWorker.instances.at(-1)!;
    TestBed.resetTestingModule();
    expect(last.terminate).toHaveBeenCalledOnce();
    last.respond(response(99));
    expect(component.inspectedMonthlyAnalysisSummaryData()).toBeUndefined();
  });

  it('handles returned/native errors and retries the current model', () => {
    InspectionWorker.instances[0].respond({ error: true });
    expect(component.calculating()).toBe('error');
    component.retry(); TestBed.tick();
    InspectionWorker.instances[1].fail();
    expect(component.calculating()).toBe('error');
    const item = store.facilityAnalyses()[0];
    update({ energyUnit: 'kWh', groups: [{ ...item.groups[0], regressionConstant: 4 }] });
    TestBed.tick();
    expect(InspectionWorker.instances[2].postMessage.mock.calls[0][0]).toMatchObject({ analysisItem: { energyUnit: 'kWh' }, selectedGroup: { regressionConstant: 4 } });
    InspectionWorker.instances[2].respond(response(4));
    expect(component.calculating()).toBe(false);
  });

  it('plots the complete selected pre-baseline period while retaining the saved baseline in its request', () => {
    const group = store.facilityAnalyses()[0].groups[0];
    update({ baselineYear: 2024, groups: [{ ...group, regressionStartYear: 2023, regressionEndYear: 2023 }] });
    TestBed.tick();
    const worker = InspectionWorker.instances.at(-1)!;
    expect(worker.postMessage.mock.calls[0][0].analysisItem.baselineYear).toBe(2024);
    const chartData = Array.from({ length: 36 }, (_, index) => ({ date: new Date(2023, index, 1), energyUse: 100, modeledEnergy: 21 }));
    worker.respond({ error: false, chartData });
    component.monthlyAnalysisGraph = new ElementRef(document.createElement('div'));
    component.drawChart();
    const traces = vi.mocked(TestBed.inject(PlotlyService).newPlot).mock.calls.at(-1)![1] as any[];
    expect(traces.find(trace => trace.name === 'Potential Model Year').x).toEqual(chartData.slice(0, 12).map(point => point.date));
    expect(traces.find(trace => trace.name === 'Potential Model Year').y).toEqual(Array(12).fill(21));
  });

  it('settles timeout and worker construction failures into an error', () => {
    vi.useFakeTimers();
    component.retry(); TestBed.tick();
    const worker = InspectionWorker.instances.at(-1)!;
    vi.advanceTimersByTime(CALCULATION_WORKER_TIMEOUT_MS);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(component.calculating()).toBe('error');
    vi.stubGlobal('Worker', class { constructor() { throw new Error('Construction failed'); } });
    component.retry(); TestBed.tick();
    expect(component.calculating()).toBe('error');
  });
});
