import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountComponent } from './account.component';
import { RouterModule } from '@angular/router';
import { AccountBannerComponent } from './account-banner/account-banner.component';
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { FormsModule } from '@angular/forms';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/_helper-pipes.module';
import { SettingsFormsModule } from 'src/app/shared/settings-forms/settings-forms.module';
import { AccountAnalysisModule } from './account-analysis/account-analysis.module';
import { AccountHomeModule } from './account-home/account-home.module';
import { CustomDatabaseModule } from 'src/app/shared/custom-database/custom-database.module';
import { AccountOverviewModule } from './account-overview/account-overview.module';
import { AccountReportsModule } from './account-reports/account-reports.module';


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
    AccountAnalysisModule,
    AccountHomeModule,
    CustomDatabaseModule,
    AccountOverviewModule,
    AccountReportsModule
  ]
})
export class AccountModule { }
