import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-annual-facility-analysis-report',
  templateUrl: './annual-facility-analysis-report.component.html',
  styleUrl: './annual-facility-analysis-report.component.css',
  standalone: false
})
export class AnnualFacilityAnalysisReportComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;
  facilityReport: IdbFacilityReport;
  print: boolean;
  printSub: Subscription;
  facilityReportSub: Subscription;
  constructor(private dataEvaluationService: DataEvaluationService,
    private facilityReportsDbService: FacilityReportsDbService
  ) { }

  ngOnInit() {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });

    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.facilityReportSub.unsubscribe();
  }
}
