import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CallbackPipe } from "./callback.pipe";

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
import { DataTableComponent } from './utility/data-table/data-table.component';
import { EnergySourceComponent } from './utility/energy-consumption/energy-source/energy-source.component';
import { HelpPanelComponent } from './utility/help-panel/help-panel.component';
import { ElectricityComponent } from './utility/energy-consumption/electricity/electricity.component';
import { NaturalGasComponent } from './utility/energy-consumption/natural-gas/natural-gas.component';

import { CommonModule } from '@angular/common';

import { PlotlyViaWindowModule } from 'angular-plotly.js';
import { StyleGuideComponent } from './shared/style-guide/style-guide.component';
import { PredictorsComponent } from './utility/predictors/predictors.component';
import { MoMeterDataComponent } from './utility/mo-meter-data/mo-meter-data.component';
import { LoadingComponent } from './shared/loading/loading.component';
import { OtherFuelsComponent } from './utility/energy-consumption/other-fuels/other-fuels.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IndexedDBModule } from './indexedDB/indexed-db.module';
import { ImportMeterDataComponent } from './utility/energy-consumption/energy-source/import-meter-data/import-meter-data.component';
import { EditMeterFormComponent } from './utility/energy-consumption/energy-source/edit-meter-form/edit-meter-form.component';
import { EditElectricBillComponent } from './utility/energy-consumption/electricity/edit-electric-bill/edit-electric-bill.component';



@NgModule({
  declarations: [
    CallbackPipe,
    AppComponent,
    HeaderComponent,
    FooterComponent,
    SidebarComponent,
    AccountComponent,
    FacilityComponent,
    UtilityComponent,
    EnergyConsumptionComponent,
    DashboardComponent,
    DataTableComponent,
    EnergySourceComponent,
    HelpPanelComponent,
    ElectricityComponent,
    NaturalGasComponent,
    StyleGuideComponent,
    PredictorsComponent,
    MoMeterDataComponent,
    LoadingComponent,
    OtherFuelsComponent,
    ImportMeterDataComponent,
    EditMeterFormComponent,
    EditElectricBillComponent
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
