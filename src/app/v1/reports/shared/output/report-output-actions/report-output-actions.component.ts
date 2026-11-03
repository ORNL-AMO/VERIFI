import { Component, computed, input, output } from '@angular/core';
import { ReportExportFormat } from '@shared/report-output/report-output.models';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { ReportOutputCapability } from '../report-output.models';

@Component({
  selector: 'app-report-output-actions', standalone: false,
  templateUrl: './report-output-actions.component.html', styleUrls: ['./report-output-actions.component.css'],
  host: { role: 'group', 'aria-label': 'Report output actions', '[attr.aria-busy]': 'capability().busy()' }
})
export class ReportOutputActionsComponent {
  readonly capability = input.required<ReportOutputCapability>();
  readonly requested = output<ReportExportFormat>();
  readonly cancelled = output<void>();
  readonly actions = computed(() => this.capability().formats.map(format => ({ format, ...OUTPUT_ACTIONS[format] })));
}

const OUTPUT_ACTIONS: Record<ReportExportFormat, { label: string; icon: IconName }> = {
  pdf: { label: 'PDF', icon: 'pdf' },
  pptx: { label: 'PowerPoint', icon: 'powerpoint' },
  xlsx: { label: 'Excel', icon: 'excel' }
};
