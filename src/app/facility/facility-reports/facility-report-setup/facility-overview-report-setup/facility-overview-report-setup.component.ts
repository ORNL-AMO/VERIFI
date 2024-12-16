import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { DataOverviewFacilityReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-facility-overview-report-setup',
  templateUrl: './facility-overview-report-setup.component.html',
  styleUrl: './facility-overview-report-setup.component.css'
})
export class FacilityOverviewReportSetupComponent {


  facilityReport: IdbFacilityReport;
  reportSettings: DataOverviewFacilityReportSettings;
  facilityReportSub: Subscription;
  isFormChange: boolean = false;
  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      if (this.isFormChange == false) {
        this.facilityReport = report;
        this.reportSettings = this.facilityReport.dataOverviewReportSettings;
      } else {
        this.isFormChange = false;
      }
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
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
  }

}
