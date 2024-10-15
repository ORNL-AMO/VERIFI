import { Component, Input } from '@angular/core';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-monthly-facility-analysis-report',
  templateUrl: './monthly-facility-analysis-report.component.html',
  styleUrl: './monthly-facility-analysis-report.component.css'
})
export class MonthlyFacilityAnalysisReportComponent {
  @Input({required: true})
  facility: IdbFacility;
  @Input({required: true})
  analysisItem: IdbAnalysisItem;
  @Input({required: true})
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
}
