import { Component, ViewChild } from '@angular/core';
import { ReportsDashboardComponent } from '@app/v1/shared/reports/reports-dashboard/reports-dashboard.component';

@Component({ selector: 'app-facility-reports-dashboard', standalone: false,
  templateUrl: './facility-reports-dashboard.component.html', styleUrls: ['./facility-reports-dashboard.component.css'] })
export class FacilityReportsDashboardComponent {
  @ViewChild(ReportsDashboardComponent) private dashboard?: ReportsDashboardComponent;
  hasUnsavedChanges(): boolean { return this.dashboard?.hasUnsavedChanges() ?? false; }
  isNavigationBlocked(): boolean { return this.dashboard?.isNavigationBlocked() ?? false; }
}
