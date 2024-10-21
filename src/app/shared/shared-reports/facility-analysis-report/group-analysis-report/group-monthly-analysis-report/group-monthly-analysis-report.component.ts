import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityReportsService } from 'src/app/facility/facility-reports/facility-reports.service';
import { MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AnalysisReportSettings } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-group-monthly-analysis-report',
  templateUrl: './group-monthly-analysis-report.component.html',
  styleUrl: './group-monthly-analysis-report.component.css'
})
export class GroupMonthlyAnalysisReportComponent {
  @Input({ required: true })
  analysisItem: IdbAnalysisItem;
  @Input({ required: true })
  groupMonthlySummary: MonthlyAnalysisSummary;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  analysisReportSettings: AnalysisReportSettings;


  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  baselineYearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  reportYearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  modelYearAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
  modelYearIsBaselineYear: boolean = false;
  modelYearIsReportYear: boolean = false;
  print: boolean;
  printSub: Subscription;
  constructor(private facilityReportService: FacilityReportsService) {

  }

  ngOnInit() {
    this.printSub = this.facilityReportService.print.subscribe(print => {
      this.print = print;
    });
    this.monthlyAnalysisSummaryData = this.groupMonthlySummary.monthlyAnalysisSummaryData;
    this.setBaselineYearMonthlyData();
    this.setReportYearMonthlyData();
    this.setModelYearMonthlyData();
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
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

  setModelYearMonthlyData() {
    if (this.groupMonthlySummary.group.analysisType == 'regression') {
      this.modelYearIsBaselineYear = this.groupMonthlySummary.group.regressionModelYear == this.analysisItem.baselineYear;
      this.modelYearIsReportYear = this.groupMonthlySummary.group.regressionModelYear == this.analysisItem.reportYear;
      if (!this.modelYearIsBaselineYear && !this.modelYearIsReportYear) {
        this.modelYearAnalysisSummaryData = this.monthlyAnalysisSummaryData.filter(summaryData => {
          return summaryData.fiscalYear == this.groupMonthlySummary.group.regressionModelYear;
        });
      }
    }
  }
}
