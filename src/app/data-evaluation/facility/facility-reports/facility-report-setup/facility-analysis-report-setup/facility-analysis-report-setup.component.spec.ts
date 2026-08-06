import { Component, EventEmitter, Injector, Input, NgModule, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceSnapshot } from 'src/app/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { getNewIdbFacilityReport, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { FacilityAnalysisReportSetupComponent } from './facility-analysis-report-setup.component';

@Component({
  selector: 'app-facility-report-analysis-selection',
  template: '',
  standalone: false
})
export class FacilityReportAnalysisSelectionStubComponent {
  @Input() facilityReport: IdbFacilityReport;
  @Input() baselineYears: Array<number>;
  @Input() selectedAnalysisItem: IdbAnalysisItem;
  @Output() selectedAnalysisItemChange = new EventEmitter<IdbAnalysisItem>();
  @Output() filteredItemsChange = new EventEmitter<Array<IdbAnalysisItem>>();
}

@NgModule({
  declarations: [FacilityAnalysisReportSetupComponent, FacilityReportAnalysisSelectionStubComponent],
  imports: [FormsModule]
})
class FacilityAnalysisReportSetupTestModule { }

describe('FacilityAnalysisReportSetupComponent', () => {
  it('initializes a new report from workspace signals before observable emissions run', () => {
    const store = new AccountWorkspaceStore();
    const facility = { id: 2, guid: 'facility-a', accountId: 'account-a', name: 'Facility A' } as any;
    const report = { ...getNewIdbFacilityReport('facility-a', 'account-a', 'analysis', []), id: 4 };
    const analysis = {
      id: 3,
      guid: 'analysis-a',
      facilityId: 'facility-a',
      accountId: 'account-a',
      name: 'Analysis A'
    } as any;
    const snapshot = {
      account: { id: 1, guid: 'account-a', name: 'Account A' },
      facilities: [facility],
      meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
      facilityAnalyses: [analysis], accountAnalyses: [], accountReports: [], facilityReports: [report],
      customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
    } as unknown as AccountWorkspaceSnapshot;
    store.publish(snapshot, { facility, facilityReport: report });
    const calanderizedMeters = new BehaviorSubject([]);
    const calendarization = {
      calanderizedMeters,
      getYearOptions: vi.fn().mockReturnValue([2024])
    };
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisReportSetupTestModule],
      providers: [
        { provide: AccountWorkspaceStore, useValue: store },
        { provide: AccountWorkspaceService, useValue: { reloadActiveWorkspace: vi.fn() } },
        { provide: WorkspaceCommandBoundary, useValue: { execute: vi.fn().mockResolvedValue({ value: {}, change: {} }) } },
        { provide: ReportCommandHandler, useValue: { updateFacilityReport: vi.fn(v => Promise.resolve(v)) } },
        { provide: CalanderizationService, useValue: calendarization }
      ]
    });
    const injector = TestBed.inject(Injector);
    const component = TestBed.runInInjectionContext(() => new FacilityAnalysisReportSetupComponent(
      TestBed.inject(CalanderizationService),
      injector
    ));

    expect(() => component.ngOnInit()).not.toThrow();
    expect(component.facilityReport.guid).toBe(report.guid);
    expect(component.analysisItems.map(item => item.guid)).toEqual(['analysis-a']);
    expect(component.reportYears).toEqual([2024]);

    component.ngOnDestroy();
  });
});
