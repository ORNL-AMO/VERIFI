import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnnualAnalysisSummaryDataClass } from 'src/app/calculations/analysis-calculations/annualAnalysisSummaryDataClass';
import { FacilityReportsService } from 'src/app/facility/facility-reports/facility-reports.service';
import { AnalysisGroup, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-group-annual-analysis-report',
  templateUrl: './group-annual-analysis-report.component.html',
  styleUrl: './group-annual-analysis-report.component.css'
})
export class GroupAnnualAnalysisReportComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;
  @Input({ required: true })
  group: AnalysisGroup;

  print: boolean;
  printSub: Subscription;
  constructor(private facilityReportService: FacilityReportsService) {

  }

  ngOnInit() {
    this.printSub = this.facilityReportService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }
}
