import { Component, computed, inject } from '@angular/core';
import { FacilityModelingReportService } from '../modeling-report.service';

@Component({ selector: 'app-modeling-report-preview', standalone: false,
  templateUrl: './modeling-report-preview.component.html', styleUrls: ['./modeling-report-preview.component.css'] })
export class ModelingReportPreviewComponent {
  readonly report = inject(FacilityModelingReportService);
  readonly canPresent = computed(() => this.report.state().state === 'ready' && !!this.report.view()?.hasContent);
}
