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
import { AccountComponent } from './account/account/account.component';
import { FacilityComponent } from './account/facility/facility.component';
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
import { ImportMeterComponent } from './utility/energy-consumption/energy-source/import-meter/import-meter.component';
import { ImportMeterDataComponent } from './utility/energy-consumption/utility-meter-data/import-meter-data/import-meter-data.component';
import { MeterGroupingComponent } from './utility/meter-grouping/meter-grouping.component';
import { EditMeterGroupFormComponent } from './utility/meter-grouping/edit-meter-group-form/edit-meter-group-form.component';


import { PredictorDataComponent } from './utility/predictor-data/predictor-data.component';
import { EditPredictorEntryRowComponent } from './utility/predictor-data/edit-predictor-entry-row/edit-predictor-entry-row.component';
import { EditPredictorsComponent } from './utility/predictor-data/edit-predictors/edit-predictors.component';
import { CalanderizationComponent } from './utility/calanderization/calanderization.component';
import { EditFacilityComponent } from './account/account/edit-facility/edit-facility.component';
import { EnergyUnitDropdownComponent } from './utility/meter-grouping/energy-unit-dropdown/energy-unit-dropdown.component';

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
    ImportMeterComponent,
    ImportMeterDataComponent,
    MeterGroupingComponent,
    EditMeterGroupFormComponent,
    PredictorDataComponent,
    EditPredictorEntryRowComponent,
    EditPredictorsComponent,
    CalanderizationComponent,
    EditFacilityComponent,
    EnergyUnitDropdownComponent
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
