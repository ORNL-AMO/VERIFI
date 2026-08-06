import { Injector, NgModule, NO_ERRORS_SCHEMA, Pipe, PipeTransform, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { FacilitySavingsReportResultsComponent } from './facility-savings-report-results.component';

@Pipe({ name: 'breakUpTableForPrint', standalone: false })
export class BreakUpTableForPrintStubPipe implements PipeTransform {
  transform(_value: unknown, _table: string): boolean { return false; }
}

@Pipe({ name: 'includeTable', standalone: false })
export class IncludeTableStubPipe implements PipeTransform {
  transform(_value: unknown, _table: string): boolean { return false; }
}

@Pipe({ name: 'groupName', standalone: false })
export class GroupNameStubPipe implements PipeTransform {
  transform(_value: string): string { return ''; }
}

@NgModule({
  declarations: [
    FacilitySavingsReportResultsComponent,
    BreakUpTableForPrintStubPipe,
    IncludeTableStubPipe,
    GroupNameStubPipe
  ],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA]
})
class FacilitySavingsReportResultsTestModule { }

describe('FacilitySavingsReportResultsComponent', () => {
  const analysis = { guid: 'analysis-a', facilityId: 'facility-a', groups: [] } as any;
  const facility = { guid: 'facility-a', name: 'Facility A' } as any;
  const report = {
    guid: 'report-a',
    name: 'Savings report',
    facilityId: 'facility-a',
    analysisItemId: 'analysis-a',
    savingsReportSettings: {
      analysisTableColumns: { actualEnergyUse: true },
      endYear: 2025,
      endMonth: 5
    }
  } as any;
  const meters = [{ guid: 'meter-a', facilityId: 'facility-a' }] as any;
  const meterData = [{ guid: 'meter-data-a', facilityId: 'facility-a' }] as any;
  const predictors = [{ guid: 'predictor-a', facilityId: 'facility-a' }] as any;
  const predictorData = [{ guid: 'predictor-data-a', facilityId: 'facility-a' }] as any;

  let store: any;
  let query: any;

  beforeEach(() => {
    store = {
      selectedFacilityReport: signal(report),
      facilityAnalyses: signal([analysis]),
      selectedFacility: signal(facility),
      account: signal({ guid: 'account-a', assessmentReportVersion: 'AR6' })
    };
    query = {
      getFacilityAnalysisByGuid: vi.fn(() => analysis),
      getFacilityMeters: vi.fn(() => meters),
      getFacilityMeterData: vi.fn(() => meterData),
      getFacilityPredictorData: vi.fn(() => predictorData),
      getFacilityPredictors: vi.fn(() => predictors)
    };
    TestBed.configureTestingModule({
      imports: [FacilitySavingsReportResultsTestModule],
      providers: [
        { provide: AccountWorkspaceStore, useValue: store },
        { provide: AccountWorkspaceQueryService, useValue: query }
      ]
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves the selected report analysis through the workspace query', () => {
    const component = createComponent();
    const summarySpy = vi.spyOn(component, 'getAnnualAnalysisSummary').mockImplementation(() => undefined);

    component.ngOnInit();
    TestBed.flushEffects();

    expect(query.getFacilityAnalysisByGuid).toHaveBeenCalledWith('analysis-a');
    expect(component.analysisItem).toBe(analysis);
    expect(component.endDate).toEqual(new Date(2025, 5, 1));
    expect(summarySpy).toHaveBeenCalledOnce();
    component.ngOnDestroy();
  });

  it('passes the same workspace inputs to the savings report worker', () => {
    const postMessage = vi.fn();
    class WorkerStub {
      onmessage: (event: MessageEvent) => void;
      postMessage = postMessage;
      terminate = vi.fn();
    }
    vi.stubGlobal('Worker', WorkerStub);
    const component = createComponent();
    component.analysisItem = analysis;
    component.facilityReport = report;

    component.getAnnualAnalysisSummary();

    expect(component.facility).toBe(facility);
    expect(postMessage).toHaveBeenCalledWith({
      analysisItem: analysis,
      facility,
      meters,
      meterData,
      accountPredictorEntries: predictorData,
      calculateAllMonthlyData: false,
      accountPredictors: predictors,
      accountAnalysisItems: [analysis],
      includeGroupSummaries: true,
      assessmentReportVersion: 'AR6',
      report
    });
  });

  function createComponent(): FacilitySavingsReportResultsComponent {
    return TestBed.runInInjectionContext(() => new FacilitySavingsReportResultsComponent(
      { itemsPerPage: of(10) } as any,
      { analysisTableColumns: new BehaviorSubject({}) } as any,
      { print: of(false) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      TestBed.inject(Injector)
    ));
  }
});
