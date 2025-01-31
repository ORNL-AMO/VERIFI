import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityReportType, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
    selector: 'app-facility-report-setup',
    templateUrl: './facility-report-setup.component.html',
    styleUrl: './facility-report-setup.component.css',
    standalone: false
})
export class FacilityReportSetupComponent {

  facilityReportType: FacilityReportType;
  reportName: string;
  constructor(private facilityReportDbService: FacilityReportsDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService
  ) {

  }

  ngOnInit() {
    let facilityReport: IdbFacilityReport = this.facilityReportDbService.selectedReport.getValue();
    this.facilityReportType = facilityReport.facilityReportType;
    this.reportName = facilityReport.name;
  }

  async saveName() {
    let facilityReport: IdbFacilityReport = this.facilityReportDbService.selectedReport.getValue();
    facilityReport.name = this.reportName;
    facilityReport = await firstValueFrom(this.facilityReportDbService.updateWithObservable(facilityReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportDbService.selectedReport.next(facilityReport);
  }
}
