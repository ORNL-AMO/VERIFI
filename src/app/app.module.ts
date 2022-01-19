import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AppComponent } from './app.component';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AccountComponent } from './account-management/account/account.component';
import { FacilityComponent } from './account-management/facility/facility.component';
import { UtilityComponent } from './utility/utility.component';
import { EnergyConsumptionComponent } from './utility/energy-consumption/energy-consumption.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EnergySourceComponent } from './utility/energy-consumption/energy-source/energy-source.component';
import { HelpPanelComponent } from './help-panel/help-panel.component';

import { CommonModule } from '@angular/common';


import { PlotlyViaWindowModule } from 'angular-plotly.js';


import { StyleGuideComponent } from './static-content/style-guide/style-guide.component';
import { LoadingComponent } from './shared/loading/loading.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IndexedDBModule } from './indexedDB/indexed-db.module';
import { EditMeterFormComponent } from './utility/energy-consumption/energy-source/edit-meter-form/edit-meter-form.component';
import { UtilityMeterDataComponent } from './utility/energy-consumption/utility-meter-data/utility-meter-data.component';
import { UtilityMeterDataFilterComponent } from './utility/energy-consumption/utility-meter-data/utility-meter-data-filter/utility-meter-data-filter.component';
import { ElectricityDataTableComponent } from './utility/energy-consumption/utility-meter-data/electricity-data-table/electricity-data-table.component';
import { GeneralUtilityDataTableComponent } from './utility/energy-consumption/utility-meter-data/general-utility-data-table/general-utility-data-table.component';
import { EditUtilityBillComponent } from './utility/energy-consumption/utility-meter-data/edit-utility-bill/edit-utility-bill.component';
import { EditElectricityBillComponent } from './utility/energy-consumption/utility-meter-data/edit-electricity-bill/edit-electricity-bill.component';
import { MeterGroupingComponent } from './utility/meter-grouping/meter-grouping.component';
import { EditMeterGroupFormComponent } from './utility/meter-grouping/edit-meter-group-form/edit-meter-group-form.component';


import { PredictorDataComponent } from './utility/predictor-data/predictor-data.component';
import { EditPredictorEntryRowComponent } from './utility/predictor-data/edit-predictor-entry-row/edit-predictor-entry-row.component';
import { EditPredictorsComponent } from './utility/predictor-data/edit-predictors/edit-predictors.component';
import { CalanderizationComponent } from './utility/calanderization/calanderization.component';
import { EnergyUnitDropdownComponent } from './utility/meter-grouping/energy-unit-dropdown/energy-unit-dropdown.component';
import { SettingsLabelPipe } from './shared/helper-pipes/settings-label.pipe';
import { VisualizationComponent } from './utility/visualization/visualization.component';
import { FacilityBarChartComponent } from './dashboard/facility-overview/facility-bar-chart/facility-bar-chart.component';
import { FacilityHeatMapComponent } from './dashboard/facility-overview/facility-heat-map/facility-heat-map.component';
import { FacilityStackedAreaChartComponent } from './dashboard/facility-overview/facility-stacked-area-chart/facility-stacked-area-chart.component';
import { FacilityOverviewComponent } from './dashboard/facility-overview/facility-overview.component';
import { AccountOverviewComponent } from './dashboard/account-overview/account-overview.component';
import { FacilitiesTableComponent } from './dashboard/account-overview/facilities-table/facilities-table.component';
import { EnergyUseDonutComponent } from './dashboard/account-overview/energy-use-donut/energy-use-donut.component';
import { EnergyUseHeatMapComponent } from './dashboard/account-overview/energy-use-heat-map/energy-use-heat-map.component';
import { EnergyUseStackedBarChartComponent } from './dashboard/account-overview/energy-use-stacked-bar-chart/energy-use-stacked-bar-chart.component';
import { MetersTableComponent } from './dashboard/facility-overview/meters-table/meters-table.component';
import { UtilityEnergyUseTableComponent } from './dashboard/facility-overview/utility-energy-use-table/utility-energy-use-table.component';
import { AccountUtilityEnergyUseTableComponent } from './dashboard/account-overview/account-utility-energy-use-table/account-utility-energy-use-table.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { EditMeterComponent } from './utility/energy-consumption/energy-source/edit-meter/edit-meter.component';
import { OrderByPipe } from './shared/helper-pipes/order-by.pipe';
import { AboutComponent } from './static-content/about/about.component';
import { FeedbackComponent } from './static-content/feedback/feedback.component';
import { AcknowledgmentsComponent } from './static-content/acknowledgments/acknowledgments.component';
import { HelpComponent } from './static-content/help/help.component';
import { MeterTableComponent } from './utility/upload-data/meter-table/meter-table.component';
import { MeterDataTableComponent } from './utility/upload-data/meter-data-table/meter-data-table.component';
import { SetupProgressComponent } from './shared/setup-progress/setup-progress.component';
import { EmptyStateComponent } from './dashboard/empty-state/empty-state.component';
import { GeneralInformationFormComponent } from './account-management/general-information-form/general-information-form.component';
import { DefaultUnitsFormComponent } from './account-management/default-units-form/default-units-form.component';
import { FinancialReportingFormComponent } from './account-management/financial-reporting-form/financial-reporting-form.component';
import { SustainabilityQuestionsFormComponent } from './account-management/sustainability-questions-form/sustainability-questions-form.component';
import { ImportMeterWizardComponent } from './utility/upload-data/import-meter-wizard/import-meter-wizard.component';
import { ImportMeterDataWizardComponent } from './utility/upload-data/import-meter-data-wizard/import-meter-data-wizard.component';
import { ValidDataTableComponent } from './utility/upload-data/import-meter-data-wizard/valid-data-table/valid-data-table.component';
import { MissingMeterNumberTableComponent } from './utility/upload-data/import-meter-data-wizard/missing-meter-number-table/missing-meter-number-table.component';
import { UploadDataComponent } from './utility/upload-data/upload-data.component';
import { ExcelWizardComponent } from './utility/upload-data/excel-wizard/excel-wizard.component';
import { ExcelDataTableComponent } from './utility/upload-data/excel-data-table/excel-data-table.component';
import { SetupDataWizardComponent } from './utility/upload-data/excel-wizard/setup-data-wizard/setup-data-wizard.component';
import { ColumnsWizardComponent } from './utility/upload-data/excel-wizard/columns-wizard/columns-wizard.component';
import { WorksheetDataTableComponent } from './utility/upload-data/excel-wizard/worksheet-data-table/worksheet-data-table.component';
import { InvalidMeterDataTableComponent } from './utility/upload-data/import-meter-data-wizard/invalid-meter-data-table/invalid-meter-data-table.component';
import { WizardDataSummaryComponent } from './utility/upload-data/excel-wizard/wizard-data-summary/wizard-data-summary.component';
import { CalanderizationFilterComponent } from './utility/calanderization/calanderization-filter/calanderization-filter.component';
import { CalanderizationChartComponent } from './utility/calanderization/calanderization-chart/calanderization-chart.component';
import { ToastNotificationsComponent } from './shared/toast-notifications/toast-notifications.component';
import { ElectronUpdateComponent } from './electron/electron-update/electron-update.component';
import { ImportPredictorsTableComponent } from './utility/upload-data/import-predictors-table/import-predictors-table.component';
import { ImportPredictorsWizardComponent } from './utility/upload-data/import-predictors-wizard/import-predictors-wizard.component';
import { ImportBackupModalComponent } from './shared/import-backup-modal/import-backup-modal.component';
import { PredictorsOrderByPipe } from './utility/predictor-data/predictors-order-by.pipe';
import { CorrelationPlotComponent } from './utility/visualization/correlation-plot/correlation-plot.component';
import { CorrelationHeatmapComponent } from './utility/visualization/correlation-heatmap/correlation-heatmap.component';
import { TimeSeriesComponent } from './utility/visualization/time-series/time-series.component';
import { CorrelationMenuComponent } from './utility/visualization/correlation-menu/correlation-menu.component';
import { DataApplicationMenuComponent } from './utility/calanderization/data-application-menu/data-application-menu.component';
import { MeterGroupTableComponent } from './utility/meter-grouping/meter-group-table/meter-group-table.component';
import { MeterGroupChartComponent } from './utility/meter-grouping/meter-group-chart/meter-group-chart.component';
import { NaicsListPipe } from './account-management/general-information-form/naics-list.pipe';
import { YearOptionsPipe } from './account-management/sustainability-questions-form/year-options.pipe';
import { CustomNumberPipe } from './shared/helper-pipes/custom-number.pipe';
import { UtilityBannerComponent } from './utility/utility-banner/utility-banner.component';
import { SiteToSourceOptionComponent } from './utility/site-to-source-option/site-to-source-option.component';
import { EnergyConsumptionHelpComponent } from './help-panel/utility/energy-consumption-help/energy-consumption-help.component';
import { AccountOverviewHelpComponent } from './help-panel/dashboard/account-overview-help/account-overview-help.component';
import { FacilityOverviewHelpComponent } from './help-panel/dashboard/facility-overview-help/facility-overview-help.component';
import { MeterGroupingHelpComponent } from './help-panel/utility/meter-grouping-help/meter-grouping-help.component';
import { CalanderizationHelpComponent } from './help-panel/utility/calanderization-help/calanderization-help.component';
import { UploadDataHelpComponent } from './help-panel/utility/upload-data-help/upload-data-help.component';
import { PredictorsDataHelpComponent } from './help-panel/utility/predictors-data-help/predictors-data-help.component';
import { VisualizationHelpComponent } from './help-panel/utility/visualization-help/visualization-help.component';
import { AccountHelpComponent } from './help-panel/account-management/account-help/account-help.component';
import { FacilityHelpComponent } from './help-panel/account-management/facility-help/facility-help.component';
import { LabelWithTooltipComponent } from './shared/label-with-tooltip/label-with-tooltip.component';
import { OverviewReportComponent } from './overview-report/overview-report.component';
import { FacilityReportComponent } from './overview-report/basic-report/facility-report/facility-report.component';
import { AccountReportComponent } from './overview-report/basic-report/account-report/account-report.component';
import { OverviewReportMenuComponent } from './overview-report/overview-report-menu/overview-report-menu.component';
import { OverviewReportBannerComponent } from './overview-report/overview-report-banner/overview-report-banner.component';
import { FrontPageComponent } from './overview-report/basic-report/front-page/front-page.component';
import { FacilityReportMetersTableComponent } from './overview-report/basic-report/facility-report/facility-report-meters-table/facility-report-meters-table.component';
import { FacilityReportUtilityUsageTableComponent } from './overview-report/basic-report/facility-report/facility-report-utility-usage-table/facility-report-utility-usage-table.component';
import { FacilityReportInfoComponent } from './overview-report/basic-report/facility-report/facility-report-info/facility-report-info.component';
import { FacilityReportBarChartComponent } from './overview-report/basic-report/facility-report/facility-report-bar-chart/facility-report-bar-chart.component';
import { AccountReportInfoComponent } from './overview-report/basic-report/account-report/account-report-info/account-report-info.component';
import { AccountReportFacilitySummaryTableComponent } from './overview-report/basic-report/account-report/account-report-facility-summary-table/account-report-facility-summary-table.component';
import { AccountReportUtilityUsageTableComponent } from './overview-report/basic-report/account-report/account-report-utility-usage-table/account-report-utility-usage-table.component';
import { AccountReportDonutComponent } from './overview-report/basic-report/account-report/account-report-donut/account-report-donut.component';
import { AccountReportUtilityUsageBarChartComponent } from './overview-report/basic-report/account-report/account-report-utility-usage-bar-chart/account-report-utility-usage-bar-chart.component';
import { AccountReportFacilityBarChartComponent } from './overview-report/basic-report/account-report/account-report-facility-bar-chart/account-report-facility-bar-chart.component';
import { OverviewReportDashboardComponent } from './overview-report/overview-report-dashboard/overview-report-dashboard.component';
import { BasicReportComponent } from './overview-report/basic-report/basic-report.component';
import { ManageReportTemplatesComponent } from './overview-report/overview-report-menu/manage-report-templates/manage-report-templates.component';
import { BasicReportHelpComponent } from './help-panel/overview-report/basic-report-help/basic-report-help.component';
import { OverviewReportDashboardHelpComponent } from './help-panel/overview-report/overview-report-dashboard-help/overview-report-dashboard-help.component';
import { OverviewReportMenuHelpComponent } from './help-panel/overview-report/overview-report-menu-help/overview-report-menu-help.component';
import { AnalysisComponent } from './analysis/analysis.component';
import { AnalysisBannerComponent } from './analysis/analysis-banner/analysis-banner.component';
import { AnalysisDashboardComponent } from './analysis/analysis-dashboard/analysis-dashboard.component';
import { RunAnalysisComponent } from './analysis/run-analysis/run-analysis.component';
import { AnalysisSetupComponent } from './analysis/run-analysis/analysis-setup/analysis-setup.component';
import { GroupAnalysisOptionsComponent } from './analysis/run-analysis/group-analysis/group-analysis-options/group-analysis-options.component';
import { GroupAnalysisComponent } from './analysis/run-analysis/group-analysis/group-analysis.component';
import { FacilityAnalysisComponent } from './analysis/run-analysis/facility-analysis/facility-analysis.component';
import { GroupAnnualEnergyIntensityComponent } from './analysis/run-analysis/group-analysis/group-annual-energy-intensity/group-annual-energy-intensity.component';
import { GroupMonthlyEnergyIntensityComponent } from './analysis/run-analysis/group-analysis/group-monthly-energy-intensity/group-monthly-energy-intensity.component';
import { MonthlyAnalysisTableComponent } from './analysis/run-analysis/group-analysis/group-monthly-energy-intensity/monthly-analysis-table/monthly-analysis-table.component';
import { MonthlyAnalysisGraphComponent } from './analysis/run-analysis/group-analysis/group-monthly-energy-intensity/monthly-analysis-graph/monthly-analysis-graph.component';
import { AnnualEnergyIntensityTableComponent } from './analysis/run-analysis/group-analysis/group-annual-energy-intensity/annual-energy-intensity-table/annual-energy-intensity-table.component';
import { AnnualEnergyIntensityGraphComponent } from './analysis/run-analysis/group-analysis/group-annual-energy-intensity/annual-energy-intensity-graph/annual-energy-intensity-graph.component';
import { FacilityAnalysisTableComponent } from './analysis/run-analysis/facility-analysis/facility-analysis-table/facility-analysis-table.component';
import { FacilityAnalysisGraphComponent } from './analysis/run-analysis/facility-analysis/facility-analysis-graph/facility-analysis-graph.component';
import { AnalysisDashboardHelpComponent } from './help-panel/analysis/analysis-dashboard-help/analysis-dashboard-help.component';
import { AnalysisSetupHelpComponent } from './help-panel/analysis/analysis-setup-help/analysis-setup-help.component';
import { FacilityAnalysisHelpComponent } from './help-panel/analysis/facility-analysis-help/facility-analysis-help.component';
import { MonthlyGroupAnalysisHelpComponent } from './help-panel/analysis/monthly-group-analysis-help/monthly-group-analysis-help.component';
import { AnnualGroupAnalysisHelpComponent } from './help-panel/analysis/annual-group-analysis-help/annual-group-analysis-help.component';
import { GroupAnalysisSetupHelpComponent } from './help-panel/analysis/group-analysis-setup-help/group-analysis-setup-help.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    SidebarComponent,
    AccountComponent,
    FacilityComponent,
    UtilityComponent,
    EnergyConsumptionComponent,
    DashboardComponent,
    EnergySourceComponent,
    HelpPanelComponent,
    StyleGuideComponent,
    LoadingComponent,
    EditMeterFormComponent,
    UtilityMeterDataComponent,
    UtilityMeterDataFilterComponent,
    ElectricityDataTableComponent,
    GeneralUtilityDataTableComponent,
    EditUtilityBillComponent,
    EditElectricityBillComponent,
    MeterGroupingComponent,
    EditMeterGroupFormComponent,
    PredictorDataComponent,
    EditPredictorEntryRowComponent,
    EditPredictorsComponent,
    CalanderizationComponent,
    EnergyUnitDropdownComponent,
    SettingsLabelPipe,
    VisualizationComponent,
    FacilityBarChartComponent,
    FacilityHeatMapComponent,
    FacilityStackedAreaChartComponent,
    FacilityOverviewComponent,
    AccountOverviewComponent,
    FacilitiesTableComponent,
    EnergyUseDonutComponent,
    EnergyUseHeatMapComponent,
    EnergyUseStackedBarChartComponent,
    MetersTableComponent,
    UtilityEnergyUseTableComponent,
    AccountUtilityEnergyUseTableComponent,
    PageNotFoundComponent,
    ImportMeterWizardComponent,
    EditMeterComponent,
    OrderByPipe,
    ImportMeterDataWizardComponent,
    ValidDataTableComponent,
    MissingMeterNumberTableComponent,
    AboutComponent,
    FeedbackComponent,
    AcknowledgmentsComponent,
    HelpComponent,
    UploadDataComponent,
    ExcelWizardComponent,
    ExcelDataTableComponent,
    MeterTableComponent,
    MeterDataTableComponent,
    SetupDataWizardComponent,
    ColumnsWizardComponent,
    WorksheetDataTableComponent,
    InvalidMeterDataTableComponent,
    WizardDataSummaryComponent,
    SetupProgressComponent,
    EmptyStateComponent,
    CalanderizationFilterComponent,
    CalanderizationChartComponent,
    GeneralInformationFormComponent,
    DefaultUnitsFormComponent,
    FinancialReportingFormComponent,
    SustainabilityQuestionsFormComponent,
    ToastNotificationsComponent,
    ElectronUpdateComponent,
    ImportPredictorsTableComponent,
    ImportPredictorsWizardComponent,
    ImportBackupModalComponent,
    PredictorsOrderByPipe,
    CorrelationPlotComponent,
    CorrelationHeatmapComponent,
    TimeSeriesComponent,
    CorrelationMenuComponent,
    DataApplicationMenuComponent,
    MeterGroupTableComponent,
    MeterGroupChartComponent,
    NaicsListPipe,
    YearOptionsPipe,
    CustomNumberPipe,
    UtilityBannerComponent,
    SiteToSourceOptionComponent,
    EnergyConsumptionHelpComponent,
    AccountOverviewHelpComponent,
    FacilityOverviewHelpComponent,
    MeterGroupingHelpComponent,
    CalanderizationHelpComponent,
    UploadDataHelpComponent,
    PredictorsDataHelpComponent,
    VisualizationHelpComponent,
    AccountHelpComponent,
    FacilityHelpComponent,
    LabelWithTooltipComponent,
    OverviewReportComponent,
    FacilityReportComponent,
    AccountReportComponent,
    OverviewReportMenuComponent,
    OverviewReportBannerComponent,
    FrontPageComponent,
    FacilityReportMetersTableComponent,
    FacilityReportUtilityUsageTableComponent,
    FacilityReportInfoComponent,
    FacilityReportBarChartComponent,
    AccountReportInfoComponent,
    AccountReportFacilitySummaryTableComponent,
    AccountReportUtilityUsageTableComponent,
    AccountReportDonutComponent,
    AccountReportUtilityUsageBarChartComponent,
    AccountReportFacilityBarChartComponent,
    OverviewReportDashboardComponent,
    BasicReportComponent,
    ManageReportTemplatesComponent,
    BasicReportHelpComponent,
    OverviewReportDashboardHelpComponent,
    OverviewReportMenuHelpComponent,
    AnalysisComponent,
    AnalysisBannerComponent,
    AnalysisDashboardComponent,
    RunAnalysisComponent,
    AnalysisSetupComponent,
    GroupAnalysisOptionsComponent,
    GroupAnalysisComponent,
    FacilityAnalysisComponent,
    GroupAnnualEnergyIntensityComponent,
    GroupMonthlyEnergyIntensityComponent,
    MonthlyAnalysisTableComponent,
    MonthlyAnalysisGraphComponent,
    AnnualEnergyIntensityTableComponent,
    AnnualEnergyIntensityGraphComponent,
    FacilityAnalysisTableComponent,
    FacilityAnalysisGraphComponent,
    AnalysisDashboardHelpComponent,
    AnalysisSetupHelpComponent,
    FacilityAnalysisHelpComponent,
    MonthlyGroupAnalysisHelpComponent,
    AnnualGroupAnalysisHelpComponent,
    GroupAnalysisSetupHelpComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule, 
    PlotlyViaWindowModule,
    DragDropModule,
    NgbModule,
    IndexedDBModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})

export class AppModule { }
