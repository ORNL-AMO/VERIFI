import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CallbackPipe } from "./callback.pipe";

import { NgxIndexedDBModule, DBConfig } from 'ngx-indexed-db';
import { NgxWebstorageModule } from 'ngx-webstorage';
import { AppRoutingModule } from './app-routing.module';
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

const dbConfig: DBConfig  = {
  name: 'verifi',
  version: 4.3,
  objectStoresMeta: [{
    store: 'accounts',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'name', keypath: 'name', options: { unique: false } },
      { name: 'industry', keypath: 'industry', options: { unique: false } },
      { name: 'naics', keypath: 'naics', options: { unique: false } },
      { name: 'notes', keypath: 'notes', options: { unique: false } },
      { name: 'img', keypath: 'img', options: { unique: false } }
    ]
  },
  {
    store: 'facilities',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'facilityid', keypath: 'facilityid', options: { unique: true} },
      { name: 'accountid', keypath: 'accountid', options: { unique: false } },
      { name: 'name', keypath: 'name', options: { unique: false } },
      { name: 'country', keypath: 'country', options: { unique: false } },
      { name: 'state', keypath: 'state', options: { unique: false } },
      { name: 'address', keypath: 'address', options: { unique: false } },
      { name: 'type', keypath: 'type', options: { unique: false } },
      { name: 'tier', keypath: 'tier', options: { unique: false } },
      { name: 'size', keypath: 'size', options: { unique: false } },
      { name: 'units', keypath: 'units', options: { unique: false } },
      { name: 'division', keypath: 'division', options: { unique: false } },
      { name: 'img', keypath: 'img', options: { unique: false } }
    ]
  },
  {
    store: 'utilityMeter',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'meterid', keypath: 'meterid', options: { unique: true} },
      { name: 'facilityid', keypath: 'facilityid', options: { unique: false} },
      { name: 'accountid', keypath: 'accountid', options: { unique: false } },
      { name: 'meterNumber', keypath: 'meterNumber', options: { unique: false } },
      { name: 'accountNumber', keypath: 'accountNumber', options: { unique: false } },
      { name: 'type', keypath: 'type', options: { unique: false } },
      { name: 'name', keypath: 'name', options: { unique: false } },
      { name: 'supplier', keypath: 'supplier', options: { unique: false } },
      { name: 'notes', keypath: 'notes', options: { unique: false } }
    ]
  },
  {
    store: 'utilityMeterData',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'dataid', keypath: 'dataid', options: { unique: true} },
      { name: 'meterid', keypath: 'meterid', options: { unique: false} },
      { name: 'facilityid', keypath: 'facilityid', options: { unique: false} },
      { name: 'accountid', keypath: 'accountid', options: { unique: false } },
      { name: 'readDate', keypath: 'readDate', options: { unique: false } },
      { name: 'kwh', keypath: 'kwh', options: { unique: false } },
      { name: 'peak', keypath: 'peak', options: { unique: false } },
      { name: 'offpeak', keypath: 'offpeak', options: { unique: false } },
      { name: 'totalDemand', keypath: 'totalDemand', options: { unique: false } },
      { name: 'totalCost', keypath: 'totalCost', options: { unique: false } }
    ]
  }]
};

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
    ElectricityComponent
  ],
  imports: [
    NgxIndexedDBModule.forRoot(dbConfig),
    NgxWebstorageModule.forRoot(),
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})

export class AppModule { }
