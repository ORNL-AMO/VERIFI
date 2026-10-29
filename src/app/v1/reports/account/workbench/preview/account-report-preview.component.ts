import { Component, inject } from '@angular/core';
import { AccountReportWorkbenchContext } from '../account-report-workbench-context.service';

@Component({ selector: 'app-account-report-preview', standalone: false,
  templateUrl: './account-report-preview.component.html', styleUrls: ['./account-report-preview.component.css'] })
export class AccountReportPreviewComponent {
  readonly context = inject(AccountReportWorkbenchContext);
}
