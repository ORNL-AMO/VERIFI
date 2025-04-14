import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
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

  facilityReport: IdbFacilityReport;
  reportSettings: DataOverviewFacilityReportSettings;
  facilityReportSub: Subscription;
  isFormChange: boolean = false;
  reportYears: Array<number>;
  baselineYears: Array<number>;
  months: Array<Month> = Months;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  dateRangeSub: Subscription;
  errorMessage: string = '';

  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private calanderizationService: CalanderizationService,
    private facilityOverviewService: FacilityOverviewService
  ) {

  }

  ngOnInit() {
    this.facilityReportsDbService.setErrorMessage(this.errorMessage);
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      if (this.isFormChange == false) {
        this.facilityReport = report;
        this.reportSettings = this.facilityReport.dataOverviewReportSettings;
      } else {
        this.isFormChange = false;
      }
    });
    this.setYearOptions();

    this.dateRangeSub = this.facilityOverviewService.dateRange.subscribe(dateRange => {
      if (dateRange) {
        this.startMonth = this.facilityReport.dataOverviewReportSettings.startMonth;
        this.startYear = this.facilityReport.dataOverviewReportSettings.startYear;
        this.endMonth = this.facilityReport.dataOverviewReportSettings.endMonth;
        this.endYear = this.facilityReport.dataOverviewReportSettings.endYear;
      }
    });

    // on browser reload
    if (this.facilityReport.dataOverviewReportSettings.startMonth !== undefined 
      && this.facilityReport.dataOverviewReportSettings.startYear !== undefined 
      && this.facilityReport.dataOverviewReportSettings.endMonth !== undefined
      && this.facilityReport.dataOverviewReportSettings.endYear !== undefined) {
      this.validateDate();
    }
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.dateRangeSub.unsubscribe();
  }

  validateDate() {

    let startDate: Date = new Date(this.facilityReport.dataOverviewReportSettings.startYear, this.facilityReport.dataOverviewReportSettings.startMonth, 1);
    let endDate: Date = new Date(this.facilityReport.dataOverviewReportSettings.endYear, this.facilityReport.dataOverviewReportSettings.endMonth, 1);

    // compare start and end date
    if (startDate.getTime() >= endDate.getTime()) {
      this.errorMessage = 'Start date cannot be later than the end date.';
      this.facilityReportsDbService.setErrorMessage(this.errorMessage); // store error message in local storage
      return;
    }

    this.errorMessage = '';
    this.facilityReportsDbService.setErrorMessage(this.errorMessage);  // store error message in local storage

    // Proceed with valid date range
    this.facilityOverviewService.dateRange.next({
      startDate: startDate,
      endDate: endDate
    });
  }

  async save() {
    this.isFormChange = true;
    let facilityReport: IdbFacilityReport = this.facilityReportsDbService.selectedReport.getValue();
    this.facilityReport.dataOverviewReportSettings = this.reportSettings;
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(facilityReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportsDbService.selectedReport.next(facilityReport);

    // proceed with date validation if all the date fields are filled
    if (this.facilityReport.dataOverviewReportSettings.startMonth !== undefined 
      && this.facilityReport.dataOverviewReportSettings.startYear !== undefined 
      && this.facilityReport.dataOverviewReportSettings.endMonth !== undefined
      && this.facilityReport.dataOverviewReportSettings.endYear !== undefined) {
      this.validateDate();
    }
  }

  setYearOptions() {
    //TODO: baseline years less than report year selection
    //TODO: report years greater than baseline year selection
    //TODO: get options by water/energy
    let yearOptions: Array<number> = this.calanderizationService.getYearOptionsAccount('all', this.facilityReport.facilityId);
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }
}
