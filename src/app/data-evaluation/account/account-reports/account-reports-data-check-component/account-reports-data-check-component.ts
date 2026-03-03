import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisReportSetup } from 'src/app/models/overview-report';

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
  facilityDetails: Array<IdbAnalysisItem> = [];
  analysisReportSetup: AnalysisReportSetup;
  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];

  constructor(private accountReportDbService: AccountReportDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private analysisDbService: AnalysisDbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    } else {
      this.analysisReportSetup = this.selectedReport.analysisReportSetup;
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.analysisDbService.getAllAccountAnalysisItems(this.account.guid).then(items => {
      this.facilityAnalysisItems = items;
      this.setFacilityItems();
    });
  }

  async setAnalysisVisited() {
    if (this.selectedAnalysisItem) {
      this.selectedAnalysisItem.isAnalysisVisited = true;
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(this.selectedAnalysisItem));
      this.accountAnalysisDbService.analysisVisited.next(undefined);
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      await this.dbChangesService.setAccountAnalysisItems(account, false);
      this.accountAnalysisDbService.selectedAnalysisItem.next(this.selectedAnalysisItem);
    }
  }

  setFacilityItems() {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.facilityDetails = [];
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

    this.facilityDetails = this.facilityAnalysisItems.filter(item => {
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
    if (this.facilityDetails) {
      this.facilityDetails.forEach(facility => {
        facility.groups.forEach(group => {
          let groupItem: FacilityGroupAnalysisItem = this.getGroupItem(group, facility.facilityId, facility.baselineYear);
          if (groupItem) {
            this.executiveSummaryItems.push(groupItem);
          }
        });
      });
      this.executiveSummaryItems = this.executiveSummaryItems.filter(item => {
        return item.group.analysisType != 'skip';
      });
    }
  }

  getGroupItem(group: AnalysisGroup, facilityId: string, baselineYear: number): FacilityGroupAnalysisItem {
    let selectedModel: JStatRegressionModel;
    if (group.analysisType == 'regression') {
      if (group.selectedModelId) {
        selectedModel = group.models.find(model => { return model.modelId == group.selectedModelId });
      }
    }
    return {
      group: group,
      selectedModel: selectedModel,
      facilityId: facilityId,
      baselineYear: baselineYear
    }
  }
}

export interface FacilityGroupAnalysisItem {
  group: AnalysisGroup,
  selectedModel: JStatRegressionModel,
  facilityId: string,
  baselineYear: number
}


