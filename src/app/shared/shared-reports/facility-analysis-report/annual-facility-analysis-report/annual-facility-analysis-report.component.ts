import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityReportsService } from 'src/app/facility/facility-reports/facility-reports.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-annual-facility-analysis-report',
  templateUrl: './annual-facility-analysis-report.component.html',
  styleUrl: './annual-facility-analysis-report.component.css'
})
export class AnnualFacilityAnalysisReportComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
  @Input({ required: true })
  facility: IdbFacility;

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
