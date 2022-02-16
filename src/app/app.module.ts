import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './core-components/header/header.component';
import { FooterComponent } from './core-components/footer/footer.component';
import { SidebarComponent } from './core-components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { PlotlyViaWindowModule } from 'angular-plotly.js';
import { LoadingComponent } from './core-components/loading/loading.component';
import { IndexedDBModule } from './indexedDB/indexed-db.module';
import { PageNotFoundComponent } from './core-components/page-not-found/page-not-found.component';
import { ToastNotificationsComponent } from './core-components/toast-notifications/toast-notifications.component';
import { ElectronUpdateComponent } from './core-components/electron-update/electron-update.component';
import { AccountManagementModule } from './account-management/account-management.module';
import { AnalysisModule } from './analysis/analysis.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HelpPanelModule } from './help-panel/help-panel.module';
import { OverviewReportModule } from './overview-report/overview-report.module';
import { StaticContentModule } from './static-content/static-content.module';
import { UtilityDataModule } from './utility-data/utility-data.module';
import { SetupProgressComponent } from './core-components/setup-progress/setup-progress.component';
import { ImportBackupModalComponent } from './core-components/import-backup-modal/import-backup-modal.component';
import { FacilityModule } from './facility/facility.module';
import { AccountModule } from './account/account.module';
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
    SetupProgressComponent,
    ImportBackupModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    PlotlyViaWindowModule,
    IndexedDBModule,
    AccountManagementModule,
    AnalysisModule,
    DashboardModule,
    HelpPanelModule,
    OverviewReportModule,
    StaticContentModule,
    UtilityDataModule,
    BrowserAnimationsModule,
    FacilityModule,
    AccountModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})

export class AppModule { }
