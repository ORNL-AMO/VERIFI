import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityGroupAnalysisItem, RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

@Component({
  selector: 'app-account-reports-data-check-component',
  standalone: false,
  templateUrl: './account-reports-data-check-component.html',
  styleUrl: './account-reports-data-check-component.css',
})
export class AccountReportsDataCheckComponent {
  selectedReport: IdbAccountReport;
  account: IdbAccount;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  facilityAnalysisItems: Array<IdbAnalysisItem> = [];
  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];
  facilityAnalysisItemsSub: Subscription;

  constructor(private accountReportDbService: AccountReportDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private analysisDbService: AnalysisDbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private regressionModelsService: RegressionModelsService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    }
    this.account = this.accountDbService.selectedAccount.getValue();

    this.facilityAnalysisItemsSub = this.analysisDbService.accountAnalysisItems.subscribe(items => {
      this.setFacilityItems(items);
    });
  }

  ngOnDestroy() {
    if (this.facilityAnalysisItemsSub) {
      this.facilityAnalysisItemsSub.unsubscribe();
    }
  }

  async setAnalysisVisited() {
    if (this.selectedAnalysisItem) {
      this.selectedAnalysisItem.isAnalysisVisited = true;
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(this.selectedAnalysisItem));
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      await this.dbChangesService.setAccountAnalysisItems(account, true);
      this.accountAnalysisDbService.selectedAnalysisItem.next(this.selectedAnalysisItem);
    }
  }

  setFacilityItems(allFacilityAnalysisItems: Array<IdbAnalysisItem>) {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.executiveSummaryItems = [];

    if (this.selectedReport.reportType == 'betterPlants') {
      this.selectedAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.betterPlantsReportSetup.analysisItemId });
    }
    else if (this.selectedReport.reportType == 'performance') {
      this.selectedAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.performanceReportSetup.analysisItemId });
    }
    else if (this.selectedReport.reportType == 'accountSavings') {
      this.selectedAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.accountSavingsReportSetup.analysisItemId });
    }

    this.facilityAnalysisItems = allFacilityAnalysisItems.filter(item => {
      const match = this.selectedAnalysisItem.facilityAnalysisItems.some(facilityItem => {
        return facilityItem.analysisItemId == item.guid;
      });
      return match;
    });

    this.initializeGroups();
    this.setAnalysisVisited();
  }

  initializeGroups() {
    this.executiveSummaryItems = [];
    this.facilityAnalysisItems.forEach(facilityAnalysisItem => {
      let facility: IdbFacility = this.facilityDbService.getFacilityById(facilityAnalysisItem.facilityId);
      facilityAnalysisItem.groups.forEach(group => {
        if (group.analysisType == 'regression') {
          let groupItem: FacilityGroupAnalysisItem = this.regressionModelsService.getGroupModelItem(group, facility, facilityAnalysisItem, this.selectedReport.reportYear);
          if (groupItem) {
            this.executiveSummaryItems.push(groupItem);
          }
        } else if (group.analysisType != 'skip') {
          this.executiveSummaryItems.push({
            group: group,
            facilityId: facility.guid,
            baselineYear: facilityAnalysisItem.baselineYear,
            selectedModel: undefined
          });
        }
      });
    });
  }
}