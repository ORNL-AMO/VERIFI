import { Component, inject } from '@angular/core';
import { AccountReportWorkbenchContext } from '../account-report-workbench-context.service';
import { AccountReportAutosaveService } from '../account-report-autosave.service';

@Component({ selector: 'app-account-report-setup', standalone: false,
  templateUrl: './account-report-setup.component.html', styleUrls: ['./account-report-setup.component.css'] })
export class AccountReportSetupComponent {
  readonly context = inject(AccountReportWorkbenchContext);
  readonly editor = inject(AccountReportAutosaveService);
}
