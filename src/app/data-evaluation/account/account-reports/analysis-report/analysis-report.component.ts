import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { Router } from '@angular/router';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { AccountReportsService } from '../account-reports.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ModelingExecutiveSummaryExcelWriter } from '../excel-writer-services/modeling-executive-summary-excel-writer';
import { FacilityGroupAnalysisItem, RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

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
  facilityAnalysisItems: Array<IdbAnalysisItem> = [];
  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];
  generateExcelSub: Subscription;
  analysisItemsSub: Subscription;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private analysisDbService: AnalysisDbService,
    private accountDbService: AccountdbService,
    private dataEvaluationService: DataEvaluationService,
    private accountReportsService: AccountReportsService,
    private loadingService: LoadingService,
    private modelingExecutiveSummaryExcelWriter: ModelingExecutiveSummaryExcelWriter,
    private regressionModelsService: RegressionModelsService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    }

    this.account = this.accountDbService.selectedAccount.getValue();

    this.analysisItemsSub = this.analysisDbService.accountAnalysisItems.subscribe(items => {
      this.setFacilityAnalysisItems(items);
    });


    this.generateExcelSub = this.accountReportsService.generateExcel.subscribe(generateExcel => {
      if (generateExcel == true) {
        this.generateExcelReport();
      }
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.generateExcelSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
  }

  setFacilityAnalysisItems(allFacilityAnalysisItems: Array<IdbAnalysisItem>) {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.analysisReportSetup.analysisItemId });
    this.facilityAnalysisItems = allFacilityAnalysisItems.filter(item => {
      const match = selectedAnalysisItem.facilityAnalysisItems.some(facilityItem => {
        return facilityItem.analysisItemId == item.guid;
      });
      return match;
    });

    this.initializeGroups();
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

  generateExcelReport() {
    this.loadingService.setLoadingMessage('Generating Executive Summary Excel Report...');
    this.loadingService.setLoadingStatus(true);
    this.modelingExecutiveSummaryExcelWriter.exportToExcel(this.selectedReport, this.executiveSummaryItems);
    this.accountReportsService.generateExcel.next(false);
    this.loadingService.setLoadingStatus(false);
  }
}