import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AppComponent } from './app.component';
import { HeaderComponent } from './core-components/header/header.component';
import { FooterComponent } from './core-components/footer/footer.component';
import { SidebarComponent } from './core-components/sidebar/sidebar.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { CommonModule } from '@angular/common';


import { PlotlyViaWindowModule } from 'angular-plotly.js';


import { LoadingComponent } from './core-components/loading/loading.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IndexedDBModule } from './indexedDB/indexed-db.module';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ToastNotificationsComponent } from './core-components/toast-notifications/toast-notifications.component';
import { ElectronUpdateComponent } from './core-components/electron-update/electron-update.component';
import { LabelWithTooltipComponent } from './shared/label-with-tooltip/label-with-tooltip.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    SidebarComponent,
    LoadingComponent,
    PageNotFoundComponent,
    ToastNotificationsComponent,
    ElectronUpdateComponent,
    LabelWithTooltipComponent,
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
