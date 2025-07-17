import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AnalysisTableColumns } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
  selector: 'app-facility-savings-report-setup',
  standalone: false,

  templateUrl: './facility-savings-report-setup.component.html',
  styleUrl: './facility-savings-report-setup.component.css'
})
export class FacilitySavingsReportSetupComponent {

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;

  analysisTableColumns: AnalysisTableColumns;
  selectedAnalysisItem: IdbAnalysisItem;
  energyColumnLabel: string;
  actualUseLabel: string;
  modeledUseLabel: string;
  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.analysisTableColumns = this.facilityReport.analysisReportSettings.analysisTableColumns;
    });

    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items;
    });
    this.setSelectedAnalysisItem(true);
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
  }

  async setSelectedAnalysisItem(onInit: boolean) {
    this.selectedAnalysisItem = this.analysisItems.find(item => {
      return item.guid == this.facilityReport.analysisItemId;
    });
    if (!onInit) {
      await this.save();
    }
  }

  async save() {
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(this.facilityReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportsDbService.selectedReport.next(this.facilityReport);
  }
}
