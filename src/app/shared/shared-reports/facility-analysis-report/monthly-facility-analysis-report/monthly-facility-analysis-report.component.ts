import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityReportsService } from 'src/app/facility/facility-reports/facility-reports.service';
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

  print: boolean;
  printSub: Subscription;
  constructor(private facilityReportService: FacilityReportsService) {

  }

  ngOnInit() {
    this.printSub = this.facilityReportService.print.subscribe(print => {
      this.print = print;
    })
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }
}
