import { Component, computed, input } from '@angular/core';
import { StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { analysisInventoryStatusLabel } from '@app/v1/shared/analysis-inventory/analysis-inventory.models';
import { AnalysisStatusNotesComponent } from '../status-notes/analysis-status-notes.component';

@Component({
  selector: 'app-analysis-details-status', standalone: true,
  imports: [IconComponent, AnalysisStatusNotesComponent],
  templateUrl: './analysis-details-status.component.html', styleUrls: ['./analysis-details-status.component.css']
})
export class AnalysisDetailsStatusComponent {
  readonly status = input.required<'evaluating' | 'ready' | 'warning' | 'error'>();
  readonly evaluation = input<StatusEvaluationState>('ready');
  readonly findings = input.required<readonly StatusItem[]>();
  readonly presentation = computed(() => {
    const status = this.status(), evaluation = this.evaluation();
    const unchecked = evaluation !== 'ready' || status === 'evaluating';
    return {
      label: analysisInventoryStatusLabel(status, evaluation),
      tone: unchecked ? 'neutral' : status === 'error' ? 'danger' : status === 'warning' ? 'warning' : 'success',
      icon: unchecked ? evaluation === 'error' ? 'info' as const : 'loading' as const : status === 'ready' ? 'success' as const : 'warning' as const,
      pending: unchecked && evaluation !== 'error'
    };
  });
}
