import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './routing/app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './core-components/header/header.component';
import { CommonModule } from '@angular/common';
import { PlotlyViaWindowModule } from 'angular-plotly.js';
import { LoadingComponent } from './core-components/loading/loading.component';
import { IndexedDBModule } from './indexedDB/indexed-db.module';
import { PageNotFoundComponent } from './core-components/page-not-found/page-not-found.component';
import { ToastNotificationsComponent } from './core-components/toast-notifications/toast-notifications.component';
import { ElectronUpdateComponent } from './core-components/electron-update/electron-update.component';
import { StaticContentModule } from './static-content/static-content.module';
import { ImportBackupModalComponent } from './core-components/import-backup-modal/import-backup-modal.component';
import { HelperPipesModule } from './shared/helper-pipes/_helper-pipes.module';
import { SearchBarComponent } from './core-components/header/search-bar/search-bar.component';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { CreateReportModalComponent } from './core-components/create-report-modal/create-report-modal.component';
import { WeatherDataModule } from './weather-data/weather-data.module';
import { ManageAccountsComponent } from './core-components/manage-accounts/manage-accounts.component';
import { ElectronBackupFileComponent } from './core-components/electron-backup-file/electron-backup-file.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { DeletingAccountDataComponent } from './core-components/deleting-account-data/deleting-account-data.component';
import { SurveyModalComponent } from './core-components/survey-modal/survey-modal.component';
import { SurveyToastComponent } from './core-components/survey-toast/survey-toast.component';
import { UserSurveyModule } from './shared/user-survey/user-survey.module';
import { DataManagementModule } from './data-management/data-management.module';
import { HomePageComponent } from './core-components/home-page/home-page.component';
import { DataEvaluationModule } from './data-evaluation/data-evaluation.module';

@NgModule({
    declarations: [
        AppComponent,
        HeaderComponent,
        LoadingComponent,
        PageNotFoundComponent,
        ToastNotificationsComponent,
        ElectronUpdateComponent,
        ImportBackupModalComponent,
        SearchBarComponent,
        CreateReportModalComponent,
        ManageAccountsComponent,
        ElectronBackupFileComponent,
        DeletingAccountDataComponent,
        SurveyModalComponent,
        SurveyToastComponent,
        HomePageComponent
    ],
    bootstrap: [AppComponent],
    imports: [
        BrowserModule,
        AppRoutingModule,
        FormsModule,
        CommonModule,
        PlotlyViaWindowModule,
        IndexedDBModule,
        StaticContentModule,
        BrowserAnimationsModule,
        HelperPipesModule,
        NgbTypeaheadModule,
        WeatherDataModule,
        UserSurveyModule,
        DataManagementModule,
        DataEvaluationModule
    ],
    providers: [provideHttpClient(withInterceptorsFromDi())]
})

export class AppModule { }
