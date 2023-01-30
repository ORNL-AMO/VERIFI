import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityOverviewComponent } from './facility-overview.component';
import { FacilityEnergyOverviewComponent } from './facility-energy-overview/facility-energy-overview.component';
import { FacilityWaterOverviewComponent } from './facility-water-overview/facility-water-overview.component';
import { FacilityCostOverviewComponent } from './facility-cost-overview/facility-cost-overview.component';
import { FacilityEmissionsOverviewComponent } from './facility-emissions-overview/facility-emissions-overview.component';
import { FacilityOverviewBannerComponent } from './facility-overview-banner/facility-overview-banner.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { EnergyMetersOverviewTableComponent } from './facility-energy-overview/energy-meters-overview-table/energy-meters-overview-table.component';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { EnergyUtilitiesUsageTableComponent } from './facility-energy-overview/energy-utilities-usage-table/energy-utilities-usage-table.component';
import { EnergyUtilitiesUsageChartComponent } from './facility-energy-overview/energy-utilities-usage-chart/energy-utilities-usage-chart.component';
import { CostMetersOverviewTableComponent } from './facility-cost-overview/cost-meters-overview-table/cost-meters-overview-table.component';
import { CostUtilitiesUsageChartComponent } from './facility-cost-overview/cost-utilities-usage-chart/cost-utilities-usage-chart.component';
import { CostUtilitiesUsageTableComponent } from './facility-cost-overview/cost-utilities-usage-table/cost-utilities-usage-table.component';
import { FacilityEnergyMonthlyChartComponent } from './facility-energy-overview/facility-energy-monthly-chart/facility-energy-monthly-chart.component';
import { FacilityCostMonthlyChartComponent } from './facility-cost-overview/facility-cost-monthly-chart/facility-cost-monthly-chart.component';
import { EmissionsMetersOverviewTableComponent } from './facility-emissions-overview/emissions-meters-overview-table/emissions-meters-overview-table.component';
import { EmissionsUtilitiesChartComponent } from './facility-emissions-overview/emissions-utilities-chart/emissions-utilities-chart.component';
import { EmissionsUtilitiesTableComponent } from './facility-emissions-overview/emissions-utilities-table/emissions-utilities-table.component';
import { FacilityEmissionsMonthlyChartComponent } from './facility-emissions-overview/facility-emissions-monthly-chart/facility-emissions-monthly-chart.component';
import { WaterMetersOverviewTableComponent } from './facility-water-overview/water-meters-overview-table/water-meters-overview-table.component';
import { WaterUtilitiesUsageChartComponent } from './facility-water-overview/water-utilities-usage-chart/water-utilities-usage-chart.component';
import { WaterUtilitiesUsageTableComponent } from './facility-water-overview/water-utilities-usage-table/water-utilities-usage-table.component';
import { FacilityWaterMonthlyChartComponent } from './facility-water-overview/facility-water-monthly-chart/facility-water-monthly-chart.component';
import { DataOverviewModule } from 'src/app/shared/data-overview/data-overview.module';



@NgModule({
  declarations: [
    FacilityOverviewComponent,
    FacilityEnergyOverviewComponent,
    FacilityWaterOverviewComponent,
    FacilityCostOverviewComponent,
    FacilityEmissionsOverviewComponent,
    FacilityOverviewBannerComponent,
    EnergyMetersOverviewTableComponent,
    EnergyUtilitiesUsageTableComponent,
    EnergyUtilitiesUsageChartComponent,
    CostMetersOverviewTableComponent,
    CostUtilitiesUsageChartComponent,
    CostUtilitiesUsageTableComponent,
    FacilityEnergyMonthlyChartComponent,
    FacilityCostMonthlyChartComponent,
    EmissionsMetersOverviewTableComponent,
    EmissionsUtilitiesChartComponent,
    EmissionsUtilitiesTableComponent,
    FacilityEmissionsMonthlyChartComponent,
    WaterMetersOverviewTableComponent,
    WaterUtilitiesUsageChartComponent,
    WaterUtilitiesUsageTableComponent,
    FacilityWaterMonthlyChartComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    DataOverviewModule
  ]
})
export class FacilityOverviewModule { }
