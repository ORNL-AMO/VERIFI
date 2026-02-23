import { Component, Input } from '@angular/core';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisReportSetup } from 'src/app/models/overview-report';
import { FacilityGroupAnalysisItem } from '../analysis-report.component';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';

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
  selectedReport: IdbAccountReport;
  facilityReport: IdbFacilityReport;
  showTitle: boolean = false;

  constructor(private accountReportDbService: AccountReportDbService,
    private facilityReportsDbService: FacilityReportsDbService
  ) { }

  ngOnChanges() {
    if (this.isFacilityReport) {
      this.facilityReport = this.facilityReportsDbService.selectedReport.getValue();
      if(this.facilityReport && (!this.facilityReport.modelingReportSettings.includeIssuesSummary && !this.facilityReport.modelingReportSettings.includeExecutiveSummary)) {
        this.showTitle = true;
      }
    }
    else {
      this.selectedReport = this.accountReportDbService.selectedReport.getValue();
      if (this.analysisReportSetup && (!this.analysisReportSetup.includeProblemsInformation && !this.analysisReportSetup.includeExecutiveSummary)) {
        this.showTitle = true;
      }
    }
    this.getRegressionGroupItems(this.executiveSummaryItems);
  }

  getRegressionGroupItems(executiveSummaryItems: FacilityGroupAnalysisItem[]) {
    this.regressionGroupItems = executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'regression';
    });
  }
}
