import { Component, computed, inject } from '@angular/core';
import { AccountModelingReportEditor } from '../editing/modeling-report-editor.service';

@Component({ selector: 'app-account-modeling-report-setup', standalone: false,
  templateUrl: './modeling-report-setup.component.html', styleUrls: ['./modeling-report-setup.component.css'] })
export class AccountModelingReportSetupComponent {
  readonly editor = inject(AccountModelingReportEditor);
  readonly context = this.editor.context;
  readonly retainedYear = computed(() => this.editor.draft().settings.reportYear !== null
    && !this.editor.periods().includes(this.editor.draft().settings.reportYear!));
  readonly unavailableYear = computed(() => this.editor.periodsCurrent() && this.retainedYear());
  readonly content = [
    { key: 'includeIssuesSummary', label: 'Issues Summary' },
    { key: 'includeExecutiveSummary', label: 'Executive Summary' },
    { key: 'includeDataValidationTables', label: 'Model Details' }
  ] as const;
}
