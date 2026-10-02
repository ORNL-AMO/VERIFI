import { Component, Input } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisResultState } from '../../calculation/facility-analysis-results.service';

export type AnalysisResultScope = 'facility' | 'group';
export type AnalysisResultPeriod = 'annual' | 'monthly';

/** Renders the mutually exclusive blocked, pending, error, and empty result states. */
@Component({
  selector: 'app-analysis-result-status',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './analysis-result-status.component.html'
})
export class AnalysisResultStatusComponent {
  @Input({ required: true }) state!: FacilityAnalysisResultState;
  @Input() blocking = false;
  @Input({ required: true }) scope: AnalysisResultScope = 'group';
  @Input({ required: true }) period: AnalysisResultPeriod = 'monthly';
  @Input() rowCount = 0;

  get periodLabel(): string {
    return this.period === 'annual' ? 'annual' : 'monthly';
  }
}
