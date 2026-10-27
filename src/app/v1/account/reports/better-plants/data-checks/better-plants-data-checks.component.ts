import { Component, computed, inject } from '@angular/core';
import { AccountReportWorkbenchContext } from '../../account-report-workbench/account-report-workbench-context.service';
import { BetterPlantsReportService } from '../better-plants-report.service';

@Component({ selector: 'app-better-plants-data-checks', standalone: false,
  templateUrl: './better-plants-data-checks.component.html', styleUrls: ['./better-plants-data-checks.component.css'] })
export class BetterPlantsDataChecksComponent {
  readonly context = inject(AccountReportWorkbenchContext);
  readonly report = inject(BetterPlantsReportService);
  readonly groupNames = computed(() => Object.fromEntries(this.context.workspace.meterGroups().map(item => [item.guid, item.name])));
  readonly facilityNames = computed(() => Object.fromEntries(this.context.workspace.facilities().map(item => [item.guid, item.name])));
}
