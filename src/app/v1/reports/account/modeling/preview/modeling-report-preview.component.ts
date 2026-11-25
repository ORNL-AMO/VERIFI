import { Component, computed, inject } from '@angular/core';
import { AccountModelingReportService } from '../modeling-report.service';

@Component({ selector: 'app-account-modeling-report-preview', standalone: false,
  templateUrl: './modeling-report-preview.component.html', styleUrls: ['./modeling-report-preview.component.css'] })
export class AccountModelingReportPreviewComponent {
  readonly report = inject(AccountModelingReportService);
  readonly canPresent = computed(() => this.report.state().state === 'ready' && !!this.report.view()?.hasContent);
}
