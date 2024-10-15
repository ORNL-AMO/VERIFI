import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisGroupItem, AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { FacilityReportsService } from 'src/app/facility/facility-reports/facility-reports.service';
import { MonthlyAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

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
  groupMonthlySummary: MonthlyAnalysisSummary;

  groupItem: AnalysisGroupItem;
  print: boolean;
  printSub: Subscription;
  constructor(private analysisService: AnalysisService, private facilityReportService: FacilityReportsService) {
  }

  ngOnInit() {
    this.groupItem = this.analysisService.getGroupItem(this.groupMonthlySummary.group);
    this.printSub = this.facilityReportService.print.subscribe(print => {
      this.print = print;
    })
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }
}
