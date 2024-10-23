import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisGroupItem, AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { FacilityReportsService } from 'src/app/facility/facility-reports/facility-reports.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-group-analysis-report',
  templateUrl: './group-analysis-report.component.html',
  styleUrl: './group-analysis-report.component.css'
})
export class GroupAnalysisReportComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  groupSummary: {
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
};
  @Input({required: true})
  analysisReportSettings: AnalysisReportSettings;


  groupItem: AnalysisGroupItem;
  print: boolean;
  printSub: Subscription;
  constructor(private analysisService: AnalysisService, private facilityReportService: FacilityReportsService) {
  }

  ngOnInit() {
    this.groupItem = this.analysisService.getGroupItem(this.groupSummary.group);
    this.printSub = this.facilityReportService.print.subscribe(print => {
      this.print = print;
    })
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }
}
