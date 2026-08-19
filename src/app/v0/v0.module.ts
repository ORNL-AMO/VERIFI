import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbPaginationModule, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { CreateReportModalComponent } from '../core-components/create-report-modal/create-report-modal.component';
import { DeletingAccountDataComponent } from '../core-components/deleting-account-data/deleting-account-data.component';
import { HeaderComponent } from '../core-components/header/header.component';
import { SearchBarComponent } from '../core-components/header/search-bar/search-bar.component';
import { HomePageComponent } from '../core-components/home-page/home-page.component';
import { ImportBackupModalComponent } from '../core-components/import-backup-modal/import-backup-modal.component';
import { ManageAccountsComponent } from '../core-components/manage-accounts/manage-accounts.component';
import { PageNotFoundComponent } from '../core-components/page-not-found/page-not-found.component';
import { ToastNotificationsComponent } from '../core-components/toast-notifications/toast-notifications.component';
import { DataEvaluationModule } from '../data-evaluation/data-evaluation.module';
import { DataManagementModule } from '../data-management/data-management.module';
import { EmailListSubscribeModule } from '../shared/email-list-subscribe/email-list-subscribe.module';
import { HelperPipesModule } from '../shared/helper-pipes/_helper-pipes.module';
import { StaticContentModule } from '../static-content/static-content.module';
import { WeatherDataModule } from '../weather-data/weather-data.module';
import { ExistingUxShellComponent } from './shell/existing-ux-shell/existing-ux-shell.component';
import { V0Routes } from './v0.routes';

@NgModule({
  declarations: [
    ExistingUxShellComponent,
    HeaderComponent,
    PageNotFoundComponent,
    ToastNotificationsComponent,
    ImportBackupModalComponent,
    SearchBarComponent,
    CreateReportModalComponent,
    ManageAccountsComponent,
    DeletingAccountDataComponent,
    HomePageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(V0Routes),
    HelperPipesModule,
    NgbTypeaheadModule,
    NgbPaginationModule,
    EmailListSubscribeModule,
    StaticContentModule,
    WeatherDataModule,
    DataManagementModule,
    DataEvaluationModule
  ]
})
export class V0Module { }
