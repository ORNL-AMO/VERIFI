import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityReportsComponent } from './facility-reports.component';
import { FacilityReportsDashboardComponent } from './facility-reports-dashboard/facility-reports-dashboard.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FacilityAnalysisReportComponent } from './facility-analysis-report/facility-analysis-report.component';
import { FacilityAnalysisReportSetupComponent } from './facility-analysis-report/facility-analysis-report-setup/facility-analysis-report-setup.component';



@NgModule({
  declarations: [
    FacilityReportsComponent,
    FacilityReportsDashboardComponent,
    FacilityAnalysisReportComponent,
    FacilityAnalysisReportSetupComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ]
})
export class FacilityReportsModule { }
