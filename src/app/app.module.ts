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
import { HelpPanelComponent } from './utility/help-panel/help-panel.component';

import { CommonModule } from '@angular/common';


import { PlotlyViaWindowModule } from 'angular-plotly.js';


import { StyleGuideComponent } from './shared/style-guide/style-guide.component';
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
import { EditFacilityComponent } from './account-management/account/edit-facility/edit-facility.component';
import { ImportPredictorsComponent } from './utility/predictor-data/import-predictors/import-predictors.component';
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
import { ImportMeterWizardComponent } from './utility/energy-consumption/energy-source/import-meter-wizard/import-meter-wizard.component';
import { EditMeterComponent } from './utility/energy-consumption/energy-source/edit-meter/edit-meter.component';
import { OrderByPipe } from './shared/helper-pipes/order-by.pipe';
import { ImportMeterDataWizardComponent } from './utility/energy-consumption/utility-meter-data/import-meter-data-wizard/import-meter-data-wizard.component';
import { ValidDataTableComponent } from './utility/energy-consumption/utility-meter-data/import-meter-data-wizard/valid-data-table/valid-data-table.component';
import { MissingMeterNumberTableComponent } from './utility/energy-consumption/utility-meter-data/import-meter-data-wizard/missing-meter-number-table/missing-meter-number-table.component';
import { SetupProgressComponent } from './shared/setup-progress/setup-progress.component';
import { EmptyStateComponent } from './dashboard/empty-state/empty-state.component';

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
    EditFacilityComponent,
    ImportPredictorsComponent,
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
    SetupProgressComponent,
    EmptyStateComponent
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
