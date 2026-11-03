import { Component, inject } from '@angular/core';
import { AccountReportWorkbenchContext } from '../account-report-workbench-context.service';
import { ACCOUNT_ANALYSIS_EDITOR } from '../editing/account-report-editor.service';

@Component({ selector: 'app-account-report-setup', standalone: false,
  templateUrl: './account-report-setup.component.html', styleUrls: ['./account-report-setup.component.css'] })
export class AccountReportSetupComponent {
  readonly context = inject(AccountReportWorkbenchContext);
  readonly editor = inject(ACCOUNT_ANALYSIS_EDITOR);
}
