import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportsSharedModule } from '../shared/reports-shared.module';
import { ReportsInventoryModule } from '../inventory/reports-inventory.module';
import { AccountReportSharedModule } from './shared/account-report-shared.module';
import { BetterPlantsReportModule } from './better-plants/better-plants-report.module';
import { AccountReportWorkbenchComponent } from './workbench/account-report-workbench.component';
import { AccountReportSetupComponent } from './workbench/setup/account-report-setup.component';

@NgModule({ declarations: [AccountReportWorkbenchComponent, AccountReportSetupComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ReportsSharedModule, ReportsInventoryModule, AccountReportSharedModule, BetterPlantsReportModule] })
export class AccountReportsModule { }
