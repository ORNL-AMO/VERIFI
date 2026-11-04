import { BetterPlantsPreviewComponent } from './preview/better-plants-preview.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { BetterPlantsDataChecksComponent } from './data-checks/better-plants-data-checks.component';
import { BetterPlantsSetupComponent } from './setup/better-plants-setup.component';
import { BetterPlantsReportingPeriodComponent } from './setup/reporting-period/better-plants-reporting-period.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { ReportsSharedModule } from '@app/v1/reports/shared/reports-shared.module';
import { ReactiveFormsModule } from '@angular/forms';

import { AccountReportSharedModule } from '../shared/account-report-shared.module';
import { BetterPlantsSetupPageComponent } from './setup/page/better-plants-setup-page.component';

@NgModule({ declarations: [BetterPlantsSetupPageComponent, BetterPlantsPreviewComponent, BetterPlantsDataChecksComponent, BetterPlantsSetupComponent, BetterPlantsReportingPeriodComponent],
  imports: [AccountReportSharedModule, AnalysisResultNumberPipe, ReactiveFormsModule, CommonModule, RouterModule, IconComponent, DataEmptyStateComponent, ReportsSharedModule] })
export class BetterPlantsReportModule { }
