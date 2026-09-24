import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { TooltipComponent } from '@app/v1/shared/tooltip/tooltip.component';

import { FacilityDataPlaceholderComponent } from './facility-data-placeholder.component';
import { FacilityMetersComponent } from './meters/facility-meters.component';
import { BillInspectionChargeSectionComponent } from './meters/meter-workbench/bill-inspection/charge-section/bill-inspection-charge-section.component';
import { BillInspectionCorrelationChartComponent } from './meters/meter-workbench/bill-inspection/correlation-chart/bill-inspection-correlation-chart.component';
import { BillInspectionOverviewChartComponent } from './meters/meter-workbench/bill-inspection/overview-chart/bill-inspection-overview-chart.component';
import { MeterWorkbenchBillInspectionComponent } from './meters/meter-workbench/bill-inspection/meter-workbench-bill-inspection.component';
import { MeterWorkbenchMonthlyChartComponent } from './meters/meter-workbench/monthly-chart/meter-workbench-monthly-chart.component';
import { MeterFiscalYearComparisonChartComponent } from './meters/meter-workbench/monthly-chart/fiscal-year-comparison-chart/meter-fiscal-year-comparison-chart.component';
import { MeterWorkbenchMonthlyDataComponent } from './meters/meter-workbench/monthly-data/meter-workbench-monthly-data.component';
import { MeterWorkbenchQualityReportComponent } from './meters/meter-workbench/quality-report/meter-workbench-quality-report.component';
import { MeterWorkbenchReadingsComponent } from './meters/meter-workbench/readings/meter-workbench-readings.component';
import { MeterReadingBillSlideoutComponent } from './meters/meter-workbench/readings/meter-reading-bill-slideout/meter-reading-bill-slideout.component';
import { MeterReadingsConfirmationModalComponent } from './meters/meter-workbench/readings/meter-readings-confirmation-modal/meter-readings-confirmation-modal.component';
import { MeterReadingsColumnsSlideoutComponent } from './meters/meter-workbench/readings/meter-readings-columns-slideout/meter-readings-columns-slideout.component';
import { MeterReadingsStatusComponent } from './meters/meter-workbench/readings/meter-readings-status/meter-readings-status.component';
import { MeterReadingsTableComponent } from './meters/meter-workbench/readings/meter-readings-table/meter-readings-table.component';
import { MeterWorkbenchSettingsComponent } from './meters/meter-workbench/settings/meter-workbench-settings.component';
import { MeterSettingsChargesFormComponent } from './meters/meter-workbench/settings/meter-settings-charges-form/meter-settings-charges-form.component';
import { MeterSettingsCoreFormComponent } from './meters/meter-workbench/settings/meter-settings-core-form/meter-settings-core-form.component';
import { MeterSettingsElectricityFormComponent } from './meters/meter-workbench/settings/meter-settings-electricity-form/meter-settings-electricity-form.component';
import { MeterSettingsEmissionsDetailsComponent } from './meters/meter-workbench/settings/meter-settings-emissions-details/meter-settings-emissions-details.component';
import { MeterSettingsOtherInfoComponent } from './meters/meter-workbench/settings/meter-settings-other-info/meter-settings-other-info.component';
import { MeterSettingsReadingFormComponent } from './meters/meter-workbench/settings/meter-settings-reading-form/meter-settings-reading-form.component';
import { MeterSettingsVehicleFormComponent } from './meters/meter-workbench/settings/meter-settings-vehicle-form/meter-settings-vehicle-form.component';
import { MeterCalendarizationHelpSlideoutComponent } from './meters/meter-workbench/settings/meter-calendarization-help-slideout/meter-calendarization-help-slideout.component';
import { MeterWorkbenchTabsComponent } from './meters/meter-workbench/meter-workbench-tabs/meter-workbench-tabs.component';
import { MeterWorkbenchComponent } from './meters/meter-workbench/meter-workbench.component';
import { MeterWorkbenchYearlyDataComponent } from './meters/meter-workbench/yearly-data/meter-workbench-yearly-data.component';
import { MeterGroupWorkbenchGraphComponent } from './meters/meter-group-workbench/graph/meter-group-workbench-graph.component';
import { MeterGroupWorkbenchTableComponent } from './meters/meter-group-workbench/table/meter-group-workbench-table.component';
import { MeterGroupWorkbenchYearlyDataComponent } from './meters/meter-group-workbench/yearly-data/meter-group-workbench-yearly-data.component';
import { MeterGroupWorkbenchComponent } from './meters/meter-group-workbench/meter-group-workbench.component';
import { ConfirmDeleteMeterModalComponent } from './meters/meters-dashboard/meter-browse-card/confirm-delete-meter-modal/confirm-delete-meter-modal.component';
import { MetersDashboardActionsService } from './meters/meters-dashboard/meters-dashboard-actions.service';
import { MetersDashboardComponent } from './meters/meters-dashboard/meters-dashboard.component';
import { MeterGroupingComponent } from './meters/meter-grouping/meter-grouping.component';
import { MeterResultsChartComponent } from './meters/shared/meter-results-chart/meter-results-chart.component';
import { FacilityPredictorsComponent } from './predictors/facility-predictors.component';
import { PredictorWorkbenchComponent } from './predictors/predictor-workbench/predictor-workbench.component';
import { PredictorWorkbenchQualityReportComponent } from './predictors/predictor-workbench/quality-report/predictor-workbench-quality-report.component';
import { PredictorWorkbenchReadingsComponent } from './predictors/predictor-workbench/readings/predictor-workbench-readings.component';
import { PredictorWorkbenchSettingsComponent } from './predictors/predictor-workbench/settings/predictor-workbench-settings.component';
import { PredictorsDashboardComponent } from './predictors/predictors-dashboard/predictors-dashboard.component';
import { WeatherPredictorWorkbenchComponent } from './predictors/weather-predictor-workbench/weather-predictor-workbench.component';
import { WeatherPredictorSetupComponent } from './predictors/weather-predictor-workbench/setup/weather-predictor-setup.component';
import { WeatherPredictorReadingsComponent } from './predictors/weather-predictor-workbench/readings/weather-predictor-readings.component';
import { WeatherPredictorQualityComponent } from './predictors/weather-predictor-workbench/quality/weather-predictor-quality.component';

@NgModule({
  declarations: [
    FacilityDataPlaceholderComponent,
    MeterWorkbenchComponent,
    MeterWorkbenchTabsComponent,
    MeterWorkbenchSettingsComponent,
    MeterSettingsCoreFormComponent,
    MeterSettingsVehicleFormComponent,
    MeterSettingsElectricityFormComponent,
    MeterSettingsChargesFormComponent,
    MeterSettingsOtherInfoComponent,
    MeterSettingsReadingFormComponent,
    MeterSettingsEmissionsDetailsComponent,
    MeterWorkbenchReadingsComponent,
    MeterWorkbenchBillInspectionComponent,
    BillInspectionOverviewChartComponent,
    BillInspectionChargeSectionComponent,
    BillInspectionCorrelationChartComponent,
    MeterWorkbenchMonthlyDataComponent,
    MeterWorkbenchMonthlyChartComponent,
    MeterWorkbenchYearlyDataComponent,
    MeterWorkbenchQualityReportComponent,
    MeterGroupWorkbenchComponent,
    MeterGroupWorkbenchTableComponent,
    MeterGroupWorkbenchGraphComponent,
    MeterGroupWorkbenchYearlyDataComponent
  ],
  imports: [
    CommonModule,
    IconsModule,
    NgbPaginationModule,
    ReactiveFormsModule,
    RouterModule,
    EChartsChartDirective,
    MeterResultsChartComponent,
    MeterFiscalYearComparisonChartComponent,
    FacilityMetersComponent,
    ConfirmDeleteMeterModalComponent,
    MetersDashboardComponent,
    MeterGroupingComponent,
    MeterReadingBillSlideoutComponent,
    MeterReadingsConfirmationModalComponent,
    MeterReadingsColumnsSlideoutComponent,
    MeterCalendarizationHelpSlideoutComponent,
    TooltipComponent,
    MeterReadingsStatusComponent,
    MeterReadingsTableComponent,
    FacilityPredictorsComponent,
    PredictorsDashboardComponent,
    PredictorWorkbenchComponent,
    PredictorWorkbenchSettingsComponent,
    PredictorWorkbenchReadingsComponent,
    PredictorWorkbenchQualityReportComponent,
    WeatherPredictorWorkbenchComponent,
    WeatherPredictorSetupComponent,
    WeatherPredictorReadingsComponent,
    WeatherPredictorQualityComponent
  ],
  exports: [
    FacilityDataPlaceholderComponent,
    FacilityMetersComponent,
    MetersDashboardComponent,
    MeterGroupingComponent,
    MeterGroupWorkbenchComponent,
    MeterWorkbenchComponent,
    FacilityPredictorsComponent,
    PredictorsDashboardComponent,
    PredictorWorkbenchComponent
  ],
  providers: [MetersDashboardActionsService]
})
export class FacilityDataModule { }
