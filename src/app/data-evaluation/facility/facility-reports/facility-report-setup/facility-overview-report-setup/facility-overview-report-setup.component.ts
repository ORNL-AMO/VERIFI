import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { Component, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { DataOverviewFacilityReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
    selector: 'app-facility-overview-report-setup',
    templateUrl: './facility-overview-report-setup.component.html',
    styleUrl: './facility-overview-report-setup.component.css',
    standalone: false
})
export class FacilityOverviewReportSetupComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);

  facilityReport: IdbFacilityReport;
  reportSettings: DataOverviewFacilityReportSettings;
  facilityReportSub: Subscription;
  isFormChange: boolean = false;
  reportYears: Array<number>;
  baselineYears: Array<number>;
  months: Array<Month> = Months;
  account: IdbAccount;
  accountSub: Subscription;
  invalidDateRange: boolean = false;
  constructor(
    private calanderizationService: CalanderizationService,
    private injector: Injector

  ) {

  }

  ngOnInit() {
    this.accountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(account => {
      this.account = account;
    });
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(report => {
      if (this.isFormChange == false) {
        this.facilityReport = report;
        this.reportSettings = this.facilityReport.dataOverviewReportSettings;
      } else {
        this.isFormChange = false;
      }
      this.setInvalidDateRange();
    });
    this.setYearOptions();
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.accountSub.unsubscribe();
  }

  async save() {
    this.isFormChange = true;
    let facilityReport: IdbFacilityReport = this.accountWorkspaceStore.selectedFacilityReport();
    this.facilityReport.dataOverviewReportSettings = this.reportSettings;
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    const { value: updatedReport } = await this.commandBoundary.execute(
      { entityKind: 'facilityReport', changeKind: 'update', entityGuid: this.facilityReport.guid, label: 'Save Report' },
      () => this.reportHandler.updateFacilityReport(this.facilityReport, activeAccountGuid)
    );
    this.facilityReport = updatedReport;
    this.accountWorkspaceService.selectFacilityReport(this.facilityReport?.guid);
  }

  setYearOptions() {
    //TODO: baseline years less than report year selection
    //TODO: report years greater than baseline year selection
    //TODO: get options by water/energy
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', true, this.facilityReport.facilityId);
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }

  setInvalidDateRange(){
    if(this.reportSettings.startYear && this.reportSettings.endYear){
      if(this.reportSettings.startYear !== this.reportSettings.endYear){
        this.invalidDateRange = this.reportSettings.startYear > this.reportSettings.endYear;
      } else {
        this.invalidDateRange = this.reportSettings.startMonth > this.reportSettings.endMonth;
      }
    } else {
      this.invalidDateRange = false;
    }
  }
}
