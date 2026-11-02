import { Component, inject } from '@angular/core';
import { AccountReportWorkbenchContext } from '../account-report-workbench-context.service';

@Component({ selector: 'app-account-report-data-checks', standalone: false,
  templateUrl: './account-report-data-checks.component.html', styleUrls: ['./account-report-data-checks.component.css'] })
export class AccountReportDataChecksComponent {
  readonly context = inject(AccountReportWorkbenchContext);
}
