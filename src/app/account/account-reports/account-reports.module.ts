import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountReportsComponent } from './account-reports.component';
import { AccountReportsBannerComponent } from './account-reports-banner/account-reports-banner.component';
import { RouterModule } from '@angular/router';
import { AccountReportsDashboardComponent } from './account-reports-dashboard/account-reports-dashboard.component';
import { AccountReportsItemCardComponent } from './account-reports-dashboard/account-reports-item-card/account-reports-item-card.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { AccountReportSetupComponent } from './account-report-setup/account-report-setup.component';



@NgModule({
  declarations: [
    AccountReportsComponent,
    AccountReportsBannerComponent,
    AccountReportsDashboardComponent,
    AccountReportsItemCardComponent,
    AccountReportSetupComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule
  ]
})
export class AccountReportsModule { }
