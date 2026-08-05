import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, Input, ViewChild, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountOverviewData, AccountOverviewFacility } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { IUseAndCost, UseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { YearMonthData } from 'src/app/models/dashboard';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { AccountReportsService } from '../../../account-reports.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { DataOverviewMapComponent } from 'src/app/shared/data-overview/data-overview-map/data-overview-map.component';
import { FacilityUsageDonutComponent } from 'src/app/shared/data-overview/facility-usage-donut/facility-usage-donut.component';
import { AccountUtilityUsageDonutComponent } from 'src/app/shared/data-overview/account-utility-usage-donut/account-utility-usage-donut.component';
import { AccountWaterUsageDonutComponent } from 'src/app/shared/data-overview/account-water-usage-donut/account-water-usage-donut.component';
import { FacilitiesUsageStackedBarChartComponent } from 'src/app/shared/data-overview/facilities-usage-stacked-bar-chart/facilities-usage-stacked-bar-chart.component';
import { AccountWaterStackedBarChartComponent } from 'src/app/shared/data-overview/account-water-stacked-bar-chart/account-water-stacked-bar-chart.component';
import { MonthlyUtilityUsageLineChartComponent } from 'src/app/shared/data-overview/monthly-utility-usage-line-chart/monthly-utility-usage-line-chart.component';

@Component({
    selector: 'app-account-section-report',
    templateUrl: './account-section-report.component.html',
    styleUrls: ['./account-section-report.component.css'],
    standalone: false
})
export class AccountSectionReportComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input()
  dataType: 'energyUse' | 'cost' | 'water' | 'emissions';
  @Input()
  dateRange: {
    startDate: Date,
    endDate: Date
  };
  @Input()
  previousYear: Date;
  @Input()
  accountOverviewFacilities: Array<AccountOverviewFacility>;
  @Input()
  sourcesUseAndCost: Array<UseAndCost>;
  @Input()
  useAndCostTotal: {
      end: IUseAndCost;
      average: IUseAndCost;
      previousYear: IUseAndCost;
  };
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;
  @Input()
  accountOverviewData: AccountOverviewData;
  @Input()
  yearMonthData: Array<YearMonthData>;

  sectionOptions: DataOverviewReportSetup;
  waterUnit: string;
  energyUnit: string;
  printSub: Subscription;
  print: boolean;

  @ViewChild(DataOverviewMapComponent) dataOverviewMap: DataOverviewMapComponent;
  @ViewChild(FacilityUsageDonutComponent) facilityUsageDonut: FacilityUsageDonutComponent;
  @ViewChild(AccountUtilityUsageDonutComponent) accountUtilityUsageDonut: AccountUtilityUsageDonutComponent;
  @ViewChild(AccountWaterUsageDonutComponent) accountWaterUsageDonut: AccountWaterUsageDonutComponent;
  @ViewChild(FacilitiesUsageStackedBarChartComponent) usageStackedBarChart: FacilitiesUsageStackedBarChartComponent;
  @ViewChild(AccountWaterStackedBarChartComponent) accountWaterStackedBarChart: AccountWaterStackedBarChartComponent;
  @ViewChild(MonthlyUtilityUsageLineChartComponent) monthlyUsageLineChart: MonthlyUtilityUsageLineChartComponent;
  
  constructor(private accountReportDbService: AccountReportDbService,
    private accountDbService: AccountdbService,
    private accountReportsService: AccountReportsService,
    private dataEvaluationService: DataEvaluationService) {
  }

  ngOnInit() {
    let account: IdbAccount = this.accountWorkspaceStore.account();
    this.waterUnit = account.volumeLiquidUnit;
    this.energyUnit = account.energyUnit;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.sectionOptions = selectedReport.dataOverviewReportSetup;

    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy(){
    this.printSub.unsubscribe();
  }

  async getMapImage(): Promise<string> {
    if (this.dataOverviewMap) {
      const base64Str = await this.dataOverviewMap.getChartAsBase64Image();
      return base64Str;
    }
    return '';
  }

  async getUsageDonutImage(): Promise<string> {
    if (this.facilityUsageDonut) {
      const base64Str = await this.facilityUsageDonut.getChartAsBase64Image();
      return base64Str;
    }
    return '';
  }

  async getUtilityUsageDonutImage(): Promise<string> {
    if (this.accountUtilityUsageDonut) {
      const base64Str = await this.accountUtilityUsageDonut.getChartAsBase64Image();
      return base64Str;
    }
    return '';
  }

  async getWaterUsageDonutImage(): Promise<string> {
    if (this.accountWaterUsageDonut) {
      const base64Str = await this.accountWaterUsageDonut.getChartAsBase64Image();
      return base64Str;
    }
    return '';
  }

  async getUtilityUsageStackedBarImage(): Promise<string> {
    if (this.usageStackedBarChart) {
      const base64Str = await this.usageStackedBarChart.getChartAsBase64Image();
      return base64Str;
    }
    return '';
  }

  async getWaterUsageStackedBarImage(): Promise<string> {
    if (this.accountWaterStackedBarChart) {
      const base64Str = await this.accountWaterStackedBarChart.getChartAsBase64Image();
      return base64Str;
    }
    return '';
  }

  async getMonthlyUsageLineChartImage(): Promise<string> {
    if (this.monthlyUsageLineChart) {
      const base64Str = await this.monthlyUsageLineChart.getChartAsBase64Image();
      return base64Str;
    }
    return '';
  }
}
