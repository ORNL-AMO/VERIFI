import { Component, Input } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

export type AnalysisResultScope = 'facility' | 'group';
export type AnalysisResultPeriod = 'annual' | 'monthly';
export type AnalysisResultStatusState =
  | { readonly state: 'idle' }
  | { readonly state: 'waiting' }
  | { readonly state: 'loading' }
  | { readonly state: 'ready' }
  | { readonly state: 'error'; readonly message: string };

/** Renders the mutually exclusive blocked, pending, error, and empty result states. */
@Component({
  selector: 'app-analysis-result-status',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './analysis-result-status.component.html'
})
export class AnalysisResultStatusComponent {
  @Input({ required: true }) state!: AnalysisResultStatusState;
  @Input() blocking = false;
  @Input({ required: true }) scope: AnalysisResultScope = 'group';
  @Input({ required: true }) period: AnalysisResultPeriod = 'monthly';
  @Input() rowCount = 0;

  get periodLabel(): string {
    return this.period === 'annual' ? 'annual' : 'monthly';
  }
}
