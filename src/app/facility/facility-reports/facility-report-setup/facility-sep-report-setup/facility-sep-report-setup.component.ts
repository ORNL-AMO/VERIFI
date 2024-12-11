import { Component } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-facility-sep-report-setup',
  templateUrl: './facility-sep-report-setup.component.html',
  styleUrl: './facility-sep-report-setup.component.css'
})
export class FacilitySepReportSetupComponent {

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;

  selectedAnalysisItem: IdbAnalysisItem;
  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
    });

    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items.filter(item => {
        return item.analysisCategory == 'energy';
      });
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

  setSelectedMonth(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.facilityReport.sepReportSettings.auditStartDate = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    this.save();
  }

}
