import { Component, computed, inject } from '@angular/core';
import { AccountReportWorkbenchContext } from '../account-report-workbench-context.service';
import { AccountReportAutosaveService } from '../account-report-autosave.service';

@Component({ selector: 'app-account-report-setup', standalone: false,
  templateUrl: './account-report-setup.component.html', styleUrls: ['./account-report-setup.component.css'] })
export class AccountReportSetupComponent {
  readonly context = inject(AccountReportWorkbenchContext);
  readonly editor = inject(AccountReportAutosaveService);
  readonly analysisCards = computed(() => this.context.analysisOptions()
    .filter(option => !option.unavailable)
    .map(option => {
      const selection = option.selection;
      const analysis = selection.scope === 'facility'
        ? this.context.workspace.facilityAnalyses().find(item => item.guid === selection.analysisGuid && item.facilityId === selection.facilityGuid)
        : this.context.workspace.accountAnalyses().find(item => item.guid === selection.analysisGuid);
      return {
        value: option.value,
        name: analysis?.name || 'Untitled analysis',
        category: analysis?.analysisCategory === 'water' ? 'Water' : 'Energy',
        baseline: analysis?.baselineYear ?? 'Not set'
      };
    }));
}
