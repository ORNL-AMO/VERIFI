import { Component, ViewChild } from '@angular/core';
import { ReportsDashboardComponent } from '@app/v1/shared/reports/reports-dashboard/reports-dashboard.component';

@Component({ selector: 'app-account-reports-dashboard', standalone: false,
  templateUrl: './account-reports-dashboard.component.html', styleUrls: ['./account-reports-dashboard.component.css'] })
export class AccountReportsDashboardComponent {
  @ViewChild(ReportsDashboardComponent) private dashboard?: ReportsDashboardComponent;
  hasUnsavedChanges(): boolean { return this.dashboard?.hasUnsavedChanges() ?? false; }
  isNavigationBlocked(): boolean { return this.dashboard?.isNavigationBlocked() ?? false; }
}
