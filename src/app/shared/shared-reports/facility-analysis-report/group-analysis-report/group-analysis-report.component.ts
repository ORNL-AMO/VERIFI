import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisGroupItem, AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { FacilityReportsService } from 'src/app/data-evaluation/facility/facility-reports/facility-reports.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-group-analysis-report',
  templateUrl: './group-analysis-report.component.html',
  styleUrl: './group-analysis-report.component.css',
  standalone: false
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
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;
  @Input()
  isFirstGroup: boolean = false;

  groupItem: AnalysisGroupItem;
  print: boolean;
  printSub: Subscription;
  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  constructor(private analysisService: AnalysisService, private facilityReportService: FacilityReportsService,
    private facilityReportsDbService: FacilityReportsDbService
  ) {
  }

  ngOnInit() {
    this.groupItem = this.analysisService.getGroupItem(this.groupSummary.group);
    this.printSub = this.facilityReportService.print.subscribe(print => {
      this.print = print;
    })
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
    });
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.facilityReportSub.unsubscribe();
  }
}
