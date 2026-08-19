import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbPaginationModule, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { CreateReportModalComponent } from '@v0/core-components/create-report-modal/create-report-modal.component';
import { DeletingAccountDataComponent } from '@v0/core-components/deleting-account-data/deleting-account-data.component';
import { HeaderComponent } from '@v0/core-components/header/header.component';
import { SearchBarComponent } from '@v0/core-components/header/search-bar/search-bar.component';
import { HomePageComponent } from '@v0/core-components/home-page/home-page.component';
import { ImportBackupModalComponent } from '@v0/core-components/import-backup-modal/import-backup-modal.component';
import { ManageAccountsComponent } from '@v0/core-components/manage-accounts/manage-accounts.component';
import { PageNotFoundComponent } from '@v0/core-components/page-not-found/page-not-found.component';
import { ToastNotificationsComponent } from '@v0/core-components/toast-notifications/toast-notifications.component';
import { DataEvaluationModule } from '@v0/data-evaluation/data-evaluation.module';
import { DataManagementModule } from '@v0/data-management/data-management.module';
import { EmailListSubscribeModule } from '@app/shared/email-list-subscribe/email-list-subscribe.module';
import { HelperPipesModule } from '@app/shared/helper-pipes/_helper-pipes.module';
import { StaticContentModule } from '@v0/static-content/static-content.module';
import { WeatherDataModule } from '@v0/weather-data/weather-data.module';
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
