import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FacilityAnalysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { FacilityAnalysisGroupModelRosterComponent } from '../../group-model-roster/facility-analysis-group-model-roster.component';
import { FacilityAnalysisCard } from '../facility-analysis.models';
import { StatusEvaluationState } from '@app/v1/status/status.models';
import { AnalysisDetailsStatusComponent } from '@app/v1/shared/analysis-results/details-status/analysis-details-status.component';
import { AnalysisLinkedItemsComponent } from '@app/v1/shared/analysis-results/linked-items/analysis-linked-items.component';
import { AnalysisLinkedItem, analysisLinkedReport } from '@app/v1/shared/analysis-results/linked-items/analysis-linked-items.models';

@Component({
  selector: 'app-analysis-details-slideout',
  standalone: true,
  imports: [
    WorkspaceSlideoutComponent,
    FacilityAnalysisGroupModelRosterComponent,
    IconComponent,
    AnalysisDetailsStatusComponent,
    AnalysisLinkedItemsComponent
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
  readonly evaluation = input<StatusEvaluationState>('ready');
  readonly actionLabel = input('Open full analysis');
  readonly actionIcon = input<IconName>('arrowRight');
  readonly actionDisabled = input(false);
  readonly secondaryActionLabel = input<string>();
  readonly secondaryActionDisabled = input(false);
  readonly closed = output<void>();
  readonly opened = output<void>();
  readonly secondaryActionSelected = output<void>();
  readonly linkedItems = computed<readonly AnalysisLinkedItem[]>(() => {
    const card = this.card();
    return [
      ...card.linkedAccountAnalyses.map(item => ({ key: `account-analysis:${item.guid}`, name: item.name || 'Untitled analysis', detail: 'Account analysis', icon: 'accountAnalysis' as const })),
      ...card.linkedReports.map(analysisLinkedReport),
      ...card.bankingConsumers.map(item => ({ key: `banking-consumer:${item.guid}`, name: item.name || 'Untitled analysis', detail: 'Banking analysis', icon: 'bank' as const })),
      ...(card.bankingSource ? [{ key: `banking-source:${card.bankingSource.guid}`, name: card.bankingSource.name || 'Untitled analysis', detail: 'Banked source', icon: 'bank' as const }] : [])
    ];
  });
}
