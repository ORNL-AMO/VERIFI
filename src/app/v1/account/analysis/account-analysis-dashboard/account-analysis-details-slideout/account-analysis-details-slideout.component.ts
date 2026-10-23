import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FacilityAnalysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AccountAnalysisCard } from '../account-analysis.models';

@Component({
  selector: 'app-account-analysis-details-slideout',
  standalone: true,
  imports: [WorkspaceSlideoutComponent, IconComponent],
  templateUrl: './account-analysis-details-slideout.component.html',
  styleUrls: ['./account-analysis-details-slideout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountAnalysisDetailsSlideoutComponent {
  readonly card = input.required<AccountAnalysisCard>();
  readonly outcomeDisplay = input.required<FacilityAnalysisOutcomeDisplay>();
  readonly ownerName = input('Account');
  readonly showCategory = input(true);
  readonly actionLabel = input<string>();
  readonly actionDisabled = input(false);
  readonly closed = output<void>();
  readonly actionSelected = output<void>();
}
