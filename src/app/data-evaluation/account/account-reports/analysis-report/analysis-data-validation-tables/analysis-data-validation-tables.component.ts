import { Component, Input } from '@angular/core';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisReportSetup } from 'src/app/models/overview-report';
import { FacilityGroupAnalysisItem } from '../analysis-report.component';

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
  @Input()
  executiveSummaryItems: Array<FacilityGroupAnalysisItem>;
  regressionGroupItems: Array<FacilityGroupAnalysisItem> = [];
  selectedReport: IdbAccountReport;

  constructor(private accountReportDbService: AccountReportDbService) { }

  ngOnChanges() {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    this.getRegressionGroupItems(this.executiveSummaryItems);
  }

  getRegressionGroupItems(executiveSummaryItems: FacilityGroupAnalysisItem[]) {
    this.regressionGroupItems = executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'regression';
    });
  }
}
