import { Component, Input } from '@angular/core';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisReportSetup } from 'src/app/models/overview-report';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { FacilityGroupAnalysisItem } from 'src/app/shared/facilityGroupItemFunction';

@Component({
  selector: 'app-analysis-data-validation-tables',
  standalone: false,

  templateUrl: './analysis-data-validation-tables.component.html',
  styleUrl: './analysis-data-validation-tables.component.css'
})
export class AnalysisDataValidationTablesComponent {

  @Input()
  facilityDetails: Array<IdbAnalysisItem>;
  @Input()
  analysisReportSetup: AnalysisReportSetup;
  @Input({ required: false })
  executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
  @Input({ required: false })
  isDataCheck: boolean;
  @Input({ required: false })
  isFacilityReport: boolean;
  regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
  showTitle: boolean = false;
  reportTitle: string;

  constructor(private accountReportDbService: AccountReportDbService,
    private facilityReportsDbService: FacilityReportsDbService
  ) { }

  ngOnChanges() {
    this.setReportTitle();
    this.getRegressionGroupItems(this.executiveSummaryItems);
  }

  getRegressionGroupItems(executiveSummaryItems: FacilityGroupAnalysisItem[]) {
    this.regressionGroupItems = executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'regression';
    });
  }

  setReportTitle() {
    if (this.isFacilityReport) {
      let report = this.facilityReportsDbService.selectedReport.getValue();
      this.reportTitle = report?.name;
      if(report && report.facilityReportType === 'modeling' && report.modelingReportSettings && (!report.modelingReportSettings.includeIssuesSummary && !report.modelingReportSettings.includeExecutiveSummary)) {
        this.showTitle = true;
      }
    }
    else {
      let report = this.accountReportDbService.selectedReport.getValue();
      this.reportTitle = report?.name;
      if(report && this.analysisReportSetup && (!this.analysisReportSetup.includeProblemsInformation && !this.analysisReportSetup.includeExecutiveSummary)) {
        this.showTitle = true;
      }
    }
  }
}
