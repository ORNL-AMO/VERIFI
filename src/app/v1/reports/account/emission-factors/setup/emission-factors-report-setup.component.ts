import { Component, computed, inject } from '@angular/core';
import { validEmissionFactorsPeriod } from '@domain/reports/emission-factors/emission-factors-period';
import { AccountEmissionFactorsReportService } from '../emission-factors-report.service';

@Component({ selector: 'app-account-emission-factors-report-setup', standalone: false,
  templateUrl: './emission-factors-report-setup.component.html', styleUrl: './emission-factors-report-setup.component.css' })
export class AccountEmissionFactorsReportSetupComponent {
  readonly report = inject(AccountEmissionFactorsReportService);
  readonly editor = this.report.editor;
  readonly fields = this.editor.form.controls.settings.controls;
  readonly startUnavailable = computed(() => this.editor.draft().settings.startYear !== null
    && !this.report.years().includes(this.editor.draft().settings.startYear));
  readonly endUnavailable = computed(() => this.editor.draft().settings.endYear !== null
    && !this.report.years().includes(this.editor.draft().settings.endYear));
  readonly periodError = computed(() => {
    const settings = this.editor.draft().settings;
    if (settings.startYear === null || settings.endYear === null) return 'Choose both a start year and an end year to continue.';
    return validEmissionFactorsPeriod(settings) ? undefined : 'Start year must be earlier than the end year.';
  });
}
