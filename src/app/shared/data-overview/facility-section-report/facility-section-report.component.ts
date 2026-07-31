import { Component, Input, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnnualSourceData, FacilityOverviewData, FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { IUseAndCost, UseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { YearMonthData } from 'src/app/models/dashboard';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { DataOverviewFacilityReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { MetersOverviewStackedLineChartComponent } from '../meters-overview-stacked-line-chart/meters-overview-stacked-line-chart.component';
import { MeterUsageDonutComponent } from '../meter-usage-donut/meter-usage-donut.component';
import { MonthlyUtilityUsageLineChartComponent } from '../monthly-utility-usage-line-chart/monthly-utility-usage-line-chart.component';
import { UtilitiesUsageChartComponent } from '../utilities-usage-chart/utilities-usage-chart.component';

@Component({
  selector: 'app-facility-section-report',
  templateUrl: './facility-section-report.component.html',
  styleUrls: ['./facility-section-report.component.css'],
  standalone: false
})
export class FacilitySectionReportComponent {
  @Input()
  dataType: 'energyUse' | 'cost' | 'water' | 'emissions';
  @Input()
  facility: IdbFacility;
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;
  @Input()
  yearMonthData: Array<YearMonthData>;
  @Input()
  annualSourceData: Array<AnnualSourceData>;
  @Input()
  facilityOverviewMeters: Array<FacilityOverviewMeter>;
  @Input()
  facilityOverviewData: FacilityOverviewData;
  @Input()
  sourcesUseAndCost: Array<UseAndCost>;
  @Input()
  useAndCostTotal: {
    end: IUseAndCost;
    average: IUseAndCost;
    previousYear: IUseAndCost;
  };
  @Input()
  dateRange: { startDate: Date, endDate: Date };
  @Input()
  previousYear: Date;
  @Input()
  inFacilityReport: boolean;

  sectionOptions: DataOverviewReportSetup | DataOverviewFacilityReportSettings;
  waterUnit: string;
  energyUnit: string;
  printSub: Subscription;
  print: boolean;

  @ViewChild('meterStackedLineChart') meterStackedLineChart !: MetersOverviewStackedLineChartComponent;
  @ViewChild('meterBarChart') meterBarChart !: MeterUsageDonutComponent;
  @ViewChild('annualBarChart') annualBarChart !: UtilitiesUsageChartComponent;
  @ViewChild('monthlyUsageLineChart') monthlyUsageLineChart !: MonthlyUtilityUsageLineChartComponent;

  constructor(private accountReportDbService: AccountReportDbService,
    private dataEvaluationService: DataEvaluationService,
    private facilityReportDbService: FacilityReportsDbService) {
  }

  ngOnInit() {
    if (!this.inFacilityReport) {
      let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
      this.sectionOptions = selectedReport.dataOverviewReportSetup;
    } else {
      let selectedReport: IdbFacilityReport = this.facilityReportDbService.selectedReport.getValue();
      this.sectionOptions = selectedReport.dataOverviewReportSettings;
    }
    this.waterUnit = this.facility.volumeLiquidUnit;
    this.energyUnit = this.facility.energyUnit;

    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
  }

  async getMeterStackedLineChartImage(): Promise<string> {
    return this.meterStackedLineChart ? await this.meterStackedLineChart.getChartAsBase64Image() : '';
  }

  async getMeterBarChartImage(): Promise<string> {
    return this.meterBarChart ? await this.meterBarChart.getChartAsBase64Image() : '';
  }

  async getAnnualBarChartImage(): Promise<string> {
    return this.annualBarChart ? await this.annualBarChart.getChartAsBase64Image() : '';
  }

  async getMonthlyUsageLineChartImage(): Promise<string> {
    return this.monthlyUsageLineChart ? await this.monthlyUsageLineChart.getChartAsBase64Image() : '';
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }

}
