import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountComponent } from './account.component';
import { RouterModule } from '@angular/router';
import { AccountBannerComponent } from './account-banner/account-banner.component';
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { FormsModule } from '@angular/forms';
import { HelperPipesModule } from '../shared/helper-pipes/helper-pipes.module';
import { SettingsFormsModule } from '../shared/settings-forms/settings-forms.module';
import { OverviewReportModule } from './overview-report/overview-report.module';
import { AccountAnalysisModule } from './account-analysis/account-analysis.module';
import { AccountHomeModule } from './account-home/account-home.module';
import { CustomDatabaseModule } from './custom-database/custom-database.module';
import { AccountOverviewModule } from './account-overview/account-overview.module';


@NgModule({
  declarations: [
    AccountComponent,
    AccountBannerComponent,
    AccountSettingsComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HelperPipesModule,
    SettingsFormsModule,
    OverviewReportModule,
    AccountAnalysisModule,
    AccountHomeModule,
    CustomDatabaseModule,
    AccountOverviewModule
  ]
})
export class AccountModule { }
