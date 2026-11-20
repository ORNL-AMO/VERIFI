import { Component, computed, inject } from '@angular/core';
import { EmissionFactorsReportService } from '../emission-factors-report.service';
import { emissionFactorsHaveContent } from '@app/v1/reports/shared/emission-factors/emission-factors-report-snapshot';

@Component({ selector: 'app-emission-factors-report-preview', standalone: false,
  templateUrl: './emission-factors-report-preview.component.html', styleUrl: './emission-factors-report-preview.component.css' })
export class EmissionFactorsReportPreviewComponent {
  readonly report = inject(EmissionFactorsReportService);
  readonly canPresent = computed(() => {
    const state = this.report.state();
    return state.state === 'ready' && !!state.value && emissionFactorsHaveContent(state.value);
  });
  readonly categories = computed(() => {
    const value = this.report.state().value;
    return (['electricity', 'other'] as const).filter(category => !!value?.[category].length);
  });
}
