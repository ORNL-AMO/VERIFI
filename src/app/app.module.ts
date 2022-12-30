import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './core-components/header/header.component';
import { SidebarComponent } from './core-components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { PlotlyViaWindowModule } from 'angular-plotly.js';
import { LoadingComponent } from './core-components/loading/loading.component';
import { IndexedDBModule } from './indexedDB/indexed-db.module';
import { PageNotFoundComponent } from './core-components/page-not-found/page-not-found.component';
import { ToastNotificationsComponent } from './core-components/toast-notifications/toast-notifications.component';
import { ElectronUpdateComponent } from './core-components/electron-update/electron-update.component';
import { HelpPanelModule } from './help-panel/help-panel.module';
import { StaticContentModule } from './static-content/static-content.module';
import { ImportBackupModalComponent } from './core-components/import-backup-modal/import-backup-modal.component';
import { FacilityModule } from './facility/facility.module';
import { AccountModule } from './account/account.module';
import { SetupWizardModule } from './setup-wizard/setup-wizard.module';
import { HelperPipesModule } from './shared/helper-pipes/helper-pipes.module';
import { SearchBarComponent } from './core-components/header/search-bar/search-bar.component';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { FacilityListPipe } from './core-components/sidebar/facility-list.pipe';
import { UploadDataModule } from './upload-data/upload-data.module';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SidebarComponent,
    LoadingComponent,
    PageNotFoundComponent,
    ToastNotificationsComponent,
    ElectronUpdateComponent,
    ImportBackupModalComponent,
    SearchBarComponent,
    FacilityListPipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    PlotlyViaWindowModule,
    IndexedDBModule,
    HelpPanelModule,
    StaticContentModule,
    BrowserAnimationsModule,
    FacilityModule,
    AccountModule,
    SetupWizardModule,
    HelperPipesModule,
    NgbTypeaheadModule,
    UploadDataModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})

export class AppModule { }
