import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { ExportReportPdfService } from 'src/app/shared/pdf-report/services/export-report-pdf.service';
import { FacilityGroupAnalysisItem, RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { FacilityModelingReportAdapter } from './facility-modeling-report.adapter';
import { FacilityModelingReportPptAdapter } from './facility-modeling-report-ppt.adapter';
import { PptReportService } from 'src/app/shared/ppt-report/ppt-report.service';

@Component({
  selector: 'app-facility-modeling-report-results',
  standalone: false,
  templateUrl: './facility-modeling-report-results.component.html',
  styleUrl: './facility-modeling-report-results.component.css',
})
export class FacilityModelingReportResultsComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  executiveSummaryItems: Array<FacilityGroupAnalysisItem> = [];
  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;
  analysisItem: IdbAnalysisItem;
  isExportingPdf: boolean = false;

  constructor(
    private regressionModelsService: RegressionModelsService,
    private facilityModelingReportAdapter: FacilityModelingReportAdapter,
    private exportReportPdfService: ExportReportPdfService,
    private facilityModelingReportPptAdapter: FacilityModelingReportPptAdapter,
    private pptReportService: PptReportService,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.facilityReportSub = toObservable(this.accountWorkspaceStore.selectedFacilityReport, { injector: this.injector }).subscribe(report => {
      this.facilityReport = report;
      this.analysisItem = this.accountWorkspaceQuery.getFacilityAnalysisByGuid(this.facilityReport.analysisItemId);
      this.executiveSummaryItems = [];
      if (this.analysisItem) {
        this.initializeFacilityGroups();
      }
    });
  }

  ngOnDestroy() {
    if (this.facilityReportSub) {
      this.facilityReportSub.unsubscribe();
    }
  }

  initializeFacilityGroups() {
    let facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    let reportYear: number;
    if (this.facilityReport.facilityReportType == 'analysis') {
      reportYear = this.facilityReport.analysisReportSettings.reportYear;
    } else if (this.facilityReport.facilityReportType == 'modeling') {
      reportYear = this.facilityReport.modelingReportSettings.reportYear;
    } else if (this.facilityReport.facilityReportType == 'savings') {
      reportYear = this.facilityReport.savingsReportSettings.endYear;
    } else if (this.facilityReport.facilityReportType == 'costSavings') {
      reportYear = this.facilityReport.costSavingsReportSettings.endYear;
    }

    this.analysisItem.groups.forEach(group => {
      if (group.analysisType == 'regression') {
        let groupItem: FacilityGroupAnalysisItem = this.regressionModelsService.getGroupModelItem(group, facility, this.analysisItem, reportYear);
        if (groupItem) {
          this.executiveSummaryItems.push(groupItem);
        }
      } else if (group.analysisType != 'skip') {
        this.executiveSummaryItems.push({
          group: group,
          facilityId: facility.guid,
          baselineYear: this.analysisItem.baselineYear,
          selectedModel: undefined
        });
      }
    });
  }

  async onExportPdf() {
    if (!this.facilityReport || this.isExportingPdf) {
      return;
    }

    this.isExportingPdf = true;
    try {
      const document = this.facilityModelingReportAdapter.buildDocument({
        facilityReport: this.facilityReport,
        analysisItem: this.analysisItem,
        executiveSummaryItems: this.executiveSummaryItems
      });

      await this.exportReportPdfService.export(document, `${this.facilityReport.name} - Modeling Report`);
    } finally {
      this.isExportingPdf = false;
    }
  }

  async downloadPpt(): Promise<void> {
    const document = this.facilityModelingReportPptAdapter.buildDocument({
      report: this.facilityReport,
      executiveSummaryItems: this.executiveSummaryItems,
    });
    await this.pptReportService.buildPowerpoint(document, `Modeling Report - ${this.facilityReport.name}.pptx`);
  }
}
