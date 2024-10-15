import { Component, Input } from '@angular/core';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-annual-facility-analysis-report',
  templateUrl: './annual-facility-analysis-report.component.html',
  styleUrl: './annual-facility-analysis-report.component.css'
})
export class AnnualFacilityAnalysisReportComponent {
  @Input({required: true})
  analysisItem: IdbAnalysisItem;
  @Input({required: true})
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
  @Input({required: true})
  facility: IdbFacility;
  
}
