import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, computed, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { Router } from '@angular/router';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { AccountReportsService } from '../account-reports.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ModelingExecutiveSummaryExcelWriter } from '../excel-writer-services/modeling-executive-summary-excel-writer';
import { FacilityGroupAnalysisItem, RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportAdapter } from './analysis-report.adapter';
import { ExportReportPdfService } from 'src/app/shared/pdf-report/services/export-report-pdf.service';

@Component({
  selector: 'app-analysis-report',
  standalone: false,
  templateUrl: './analysis-report.component.html',
  styleUrl: './analysis-report.component.css'
})
export class AnalysisReportComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedReport: IdbAccountReport;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  facilityAnalysisItems: Array<IdbAnalysisItem> = [];
  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];
  generateExcelSub: Subscription;
  analysisItemsSub: Subscription;
  isExportingPdf: boolean = false;
  constructor(
    private router: Router,
    private dataEvaluationService: DataEvaluationService,
    private accountReportsService: AccountReportsService,
    private loadingService: LoadingService,
    private modelingExecutiveSummaryExcelWriter: ModelingExecutiveSummaryExcelWriter,
    private regressionModelsService: RegressionModelsService,
    private analysisReportAdapter: AnalysisReportAdapter,
    private exportReportPdfService: ExportReportPdfService,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    }

    this.account = this.accountWorkspaceStore.account();

    this.analysisItemsSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityAnalyses()]), { injector: this.injector }).subscribe(items => {
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
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = [...this.accountWorkspaceStore.accountAnalyses()];
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
      let facility: IdbFacility = this.accountWorkspaceStore.facilities().find(facility => facility.guid === (facilityAnalysisItem.facilityId));
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

  async onExportPdf() {
    if (!this.selectedReport || this.isExportingPdf) {
      return;
    }

    this.isExportingPdf = true;
    try {
      const document = this.analysisReportAdapter.buildDocument({
        accountReport: this.selectedReport,
        facilityAnalysisItems: this.facilityAnalysisItems,
        executiveSummaryItems: this.executiveSummaryItems
      });

      await this.exportReportPdfService.export(document, `${this.selectedReport.name} - Modeling Report`);
    } finally {
      this.isExportingPdf = false;
    }
  }
}