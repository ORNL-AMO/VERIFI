import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalysisCategory } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-active-summary-card',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './active-summary-card.component.html',
  styleUrls: ['./active-summary-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActiveSummaryCardComponent {
  readonly analysisName = input.required<string>();
  readonly category = input.required<AnalysisCategory>();
  readonly route = input.required<readonly string[]>();
  readonly validationIssueCount = input(0);
  readonly resultState = input<'loading' | 'blocked' | 'error' | 'ready'>('loading');
  readonly resultMessage = input('Calculating results');
  readonly resultValueLabel = input('Unavailable');
  readonly resultPeriodLabel = input('Latest month');
}
