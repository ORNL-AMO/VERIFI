import { Component, Input } from '@angular/core';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { FacilityGroupAnalysisItem } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

@Component({
  selector: 'app-analysis-data-validation-tables',
  standalone: false,

  templateUrl: './analysis-data-validation-tables.component.html',
  styleUrl: './analysis-data-validation-tables.component.css'
})
export class AnalysisDataValidationTablesComponent {
  @Input({ required: false })
  executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
  @Input({ required: false })
  isDataCheck: boolean;
  @Input()
  facilityReport: IdbFacilityReport;
  @Input()
  accountReport: IdbAccountReport;



  regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
  showTitle: boolean = false;
  reportTitle: string;

  constructor() { }

  ngOnChanges() {
    this.setReportTitle();
    this.getRegressionGroupItems();
  }

  getRegressionGroupItems() {
    this.regressionGroupItems = this.executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'regression';
    });
  }

  setReportTitle() {
    if (this.facilityReport) {
      this.reportTitle = this.facilityReport.name;
      if (this.facilityReport && this.facilityReport.facilityReportType === 'modeling' && this.facilityReport.modelingReportSettings && (!this.facilityReport.modelingReportSettings.includeIssuesSummary && !this.facilityReport.modelingReportSettings.includeExecutiveSummary)) {
        this.showTitle = true;
      }
    }
    else if (this.accountReport) {
      this.reportTitle = this.accountReport.name;
      if (this.accountReport && this.accountReport.analysisReportSetup && (!this.accountReport.analysisReportSetup.includeProblemsInformation && !this.accountReport.analysisReportSetup.includeExecutiveSummary)) {
        this.showTitle = true;
      }
    }
  }
}
