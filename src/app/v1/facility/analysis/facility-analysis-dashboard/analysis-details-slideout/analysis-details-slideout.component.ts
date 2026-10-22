import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FacilityAnalysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { FacilityAnalysisGroupModelRosterComponent } from '../../group-model-roster/facility-analysis-group-model-roster.component';
import { FacilityAnalysisCard } from '../facility-analysis.models';

@Component({
  selector: 'app-analysis-details-slideout',
  standalone: true,
  imports: [
    WorkspaceSlideoutComponent,
    FacilityAnalysisGroupModelRosterComponent,
    IconComponent
  ],
  templateUrl: './analysis-details-slideout.component.html',
  styleUrls: ['./analysis-details-slideout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalysisDetailsSlideoutComponent {
  readonly card = input.required<FacilityAnalysisCard>();
  readonly meterGroups = input.required<readonly IdbUtilityMeterGroup[]>();
  readonly outcomeDisplay = input<FacilityAnalysisOutcomeDisplay>();
  readonly opening = input(false);
  readonly showCategory = input(true);
  readonly closed = output<void>();
  readonly opened = output<void>();
}
