import { Component, computed, inject } from '@angular/core';
import { emissionFactorsHaveContent } from '@app/v1/reports/shared/emission-factors/emission-factors-report-snapshot';
import { AccountEmissionFactorsReportService } from '../emission-factors-report.service';

@Component({ selector: 'app-account-emission-factors-report-preview', standalone: false,
  templateUrl: './emission-factors-report-preview.component.html', styleUrl: './emission-factors-report-preview.component.css' })
export class AccountEmissionFactorsReportPreviewComponent {
  readonly report = inject(AccountEmissionFactorsReportService);
  readonly canPresent = computed(() => {
    const state = this.report.state();
    return state.state === 'ready' && !!state.value?.some(emissionFactorsHaveContent);
  });
}
