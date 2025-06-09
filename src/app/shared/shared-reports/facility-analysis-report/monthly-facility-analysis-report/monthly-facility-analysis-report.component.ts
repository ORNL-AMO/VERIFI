import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityReportsService } from 'src/app/facility/facility-reports/facility-reports.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-monthly-facility-analysis-report',
  templateUrl: './monthly-facility-analysis-report.component.html',
  styleUrl: './monthly-facility-analysis-report.component.css',
  standalone: false
})
export class MonthlyFacilityAnalysisReportComponent {
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;
  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;
  baselineYearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  reportYearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  print: boolean;
  printSub: Subscription;
  constructor(private facilityReportService: FacilityReportsService,
    private facilityReportsDbService: FacilityReportsDbService
  ) { }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
    });
    this.printSub = this.facilityReportService.print.subscribe(print => {
      this.print = print;
    });
    this.setBaselineYearMonthlyData();
    this.setReportYearMonthlyData();
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
    this.facilityReportSub.unsubscribe();
  }


  setBaselineYearMonthlyData() {
    this.baselineYearAnalysisSummaryData = this.monthlyAnalysisSummaryData.filter(summaryData => {
      return summaryData.fiscalYear == this.analysisItem.baselineYear;
    })
  }

  setReportYearMonthlyData() {
    this.reportYearAnalysisSummaryData = this.monthlyAnalysisSummaryData.filter(summaryData => {
      return summaryData.fiscalYear == this.analysisItem.reportYear;
    });
  }
}
