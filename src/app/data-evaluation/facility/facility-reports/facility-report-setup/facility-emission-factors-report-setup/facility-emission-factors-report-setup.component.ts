import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport, EmissionFactorsReportSettings } from 'src/app/models/idbModels/facilityReport';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { FacilityReportsService } from '../../facility-reports.service';

@Component({
  selector: 'app-facility-emission-factors-report-setup',
  standalone: false,

  templateUrl: './facility-emission-factors-report-setup.component.html',
  styleUrl: './facility-emission-factors-report-setup.component.css'
})
export class FacilityEmissionFactorsReportSetupComponent {

  facilityReport: IdbFacilityReport;
  reportSettings: EmissionFactorsReportSettings;
  facilityReportSub: Subscription;
  isFormChange: boolean = false;
  reportYears: Array<number>;
  baselineYears: Array<number>;
  months: Array<Month> = Months;
  errorMessage: string;
  errorMessageSub: Subscription;

  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private calanderizationService: CalanderizationService,
    private facilityReportsService: FacilityReportsService
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      if (this.isFormChange == false) {
        this.facilityReport = report;
        this.reportSettings = this.facilityReport.emissionFactorsReportSettings;
      } else {
        this.isFormChange = false;
      }
    });
    this.setYearOptions();

    this.errorMessageSub = this.facilityReportsService.errorMessage.subscribe(message => {
      this.errorMessage = message;
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.errorMessageSub.unsubscribe();
  }

  async save() {
    this.isFormChange = true;
    let facilityReport: IdbFacilityReport = this.facilityReportsDbService.selectedReport.getValue();
    this.facilityReport.emissionFactorsReportSettings = this.reportSettings;
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(facilityReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportsDbService.selectedReport.next(facilityReport);
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
