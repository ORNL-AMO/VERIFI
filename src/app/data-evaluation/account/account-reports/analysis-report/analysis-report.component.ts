import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountReportsService } from '../account-reports.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { Router } from '@angular/router';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisReportSetup } from 'src/app/models/overview-report';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';

@Component({
  selector: 'app-analysis-report',
  standalone: false,
  templateUrl: './analysis-report.component.html',
  styleUrl: './analysis-report.component.css'
})
export class AnalysisReportComponent {

  selectedReport: IdbAccountReport;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  facilityAnalysisItems: Array<IdbAnalysisItem> = [];
  facilityDetails: Array<IdbAnalysisItem> = [];
  analysisReportSetup: AnalysisReportSetup;
  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];

  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private analysisDbService: AnalysisDbService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
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

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }

  setFacilityItems() {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.analysisReportSetup.analysisItemId });

    this.facilityDetails = this.facilityAnalysisItems.filter(item => {
      const match = selectedAnalysisItem.facilityAnalysisItems.some(facilityItem => {
        return facilityItem.analysisItemId == item.guid;
      });
      return match;
    });

    this.initializeGroups();
  }

  initializeGroups() {
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