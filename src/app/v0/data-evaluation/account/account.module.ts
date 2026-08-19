import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountComponent } from '@v0/data-evaluation/account/account.component';
import { RouterModule } from '@angular/router';
import { AccountBannerComponent } from '@v0/data-evaluation/account/account-banner/account-banner.component';
import { AccountSettingsComponent } from '@v0/data-evaluation/account/account-settings/account-settings.component';
import { FormsModule } from '@angular/forms';
import { HelperPipesModule } from '@shared/helper-pipes/_helper-pipes.module';
import { SettingsFormsModule } from '@v0/shared/settings-forms/settings-forms.module';
import { AccountAnalysisModule } from '@v0/data-evaluation/account/account-analysis/account-analysis.module';
import { AccountHomeModule } from '@v0/data-evaluation/account/account-home/account-home.module';
import { CustomDatabaseModule } from '@v0/shared/custom-database/custom-database.module';
import { AccountOverviewModule } from '@v0/data-evaluation/account/account-overview/account-overview.module';
import { AccountReportsModule } from '@v0/data-evaluation/account/account-reports/account-reports.module';


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
