import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-facility-report-setup',
  templateUrl: './facility-report-setup.component.html',
  styleUrl: './facility-report-setup.component.css'
})
export class FacilityReportSetupComponent {

  facilityReport: IdbFacilityReport;
  constructor(private facilityReportDbService: FacilityReportsDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService
  ) {

  }

  ngOnInit() {
    this.facilityReport = this.facilityReportDbService.selectedReport.getValue();
  }

  async save() {
    this.facilityReport = await firstValueFrom(this.facilityReportDbService.updateWithObservable(this.facilityReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportDbService.selectedReport.next(this.facilityReport);
  }
}
