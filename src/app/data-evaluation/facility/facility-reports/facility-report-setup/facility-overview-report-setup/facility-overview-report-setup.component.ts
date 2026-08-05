import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
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
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

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
  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private calanderizationService: CalanderizationService
  ) {

  }

  ngOnInit() {
    this.accountSub = toObservable(this.accountWorkspaceStore.account).subscribe(account => {
      this.account = account;
    });
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
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
    let facilityReport: IdbFacilityReport = this.facilityReportsDbService.selectedReport.getValue();
    this.facilityReport.dataOverviewReportSettings = this.reportSettings;
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(facilityReport));
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    await this.dbChangesService.setAccountFacilityReports(this.account, selectedFacility);
    this.facilityReportsDbService.selectedReport.next(facilityReport);
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
