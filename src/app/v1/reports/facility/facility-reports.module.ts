import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportsSharedModule } from '../shared/reports-shared.module';
import { AnalysisReportModule } from './analysis/analysis-report.module';
import { DataQualityReportModule } from './data-quality/data-quality-report.module';
import { ModelingReportModule } from './modeling/modeling-report.module';
import { EmissionFactorsReportModule } from './emission-factors/emission-factors-report.module';
import { FacilityReportWorkbenchComponent } from './workbench/facility-report-workbench.component';
import { FacilityReportSetupComponent } from './workbench/setup/facility-report-setup.component';

@NgModule({ declarations: [FacilityReportWorkbenchComponent, FacilityReportSetupComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ReportsSharedModule, AnalysisReportModule, DataQualityReportModule, ModelingReportModule, EmissionFactorsReportModule] })
export class FacilityReportsModule { }
