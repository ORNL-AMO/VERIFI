import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ResourceBrowseCardComponent } from '@app/v1/shared/resource-browse-card/resource-browse-card.component';
import { ResourceBrowseCardAction } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { FacilityAnalysisGroupModelRosterComponent } from '../../group-model-roster/facility-analysis-group-model-roster.component';
import { FacilityAnalysisDashboardCard } from '../facility-analysis.models';
import { buildFacilityAnalysisResourceView } from './facility-analysis-card.view';

@Component({
  selector: 'app-analysis-browse-card',
  host: { class: 'v1-resource-browse-card-host' },
  standalone: true,
  imports: [ResourceBrowseCardComponent, FacilityAnalysisGroupModelRosterComponent],
  templateUrl: './analysis-browse-card.component.html',
  styleUrls: ['./analysis-browse-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalysisBrowseCardComponent {
  readonly card = input.required<FacilityAnalysisDashboardCard>();
  readonly meterGroups = input<readonly IdbUtilityMeterGroup[]>([]);
  readonly showGroupDetails = input(false);
  readonly selectedForComparison = input(false);
  readonly comparisonDisabledReason = input<string | undefined>(undefined);
  readonly canAct = input(true);
  readonly opened = output<FacilityAnalysisDashboardCard>();
  readonly detailsRequested = output<FacilityAnalysisDashboardCard>();
  readonly comparisonToggled = output<FacilityAnalysisDashboardCard>();
  readonly copyRequested = output<FacilityAnalysisDashboardCard>();
  readonly activeRequested = output<FacilityAnalysisDashboardCard>();
  readonly deleteRequested = output<FacilityAnalysisDashboardCard>();

  readonly view = computed(() => buildFacilityAnalysisResourceView(this.card()));
  readonly actions = computed<readonly ResourceBrowseCardAction[]>(() => {
    const card = this.card();
    const comparisonDisabledReason = this.comparisonDisabledReason();
    return [
      {
        id: 'active',
        label: card.isActiveForReporting ? 'Active for reporting' : 'Set active for reporting',
        icon: 'target',
        disabled: !this.canAct() || card.isActiveForReporting
      },
      { id: 'details', label: 'View analysis details', icon: 'monocle' },
      {
        id: 'compare',
        label: this.selectedForComparison()
          ? 'Remove from comparison'
          : comparisonDisabledReason || 'Add to comparison',
        icon: 'transfer',
        disabled: !!comparisonDisabledReason && !this.selectedForComparison()
      },
      { id: 'copy', label: 'Copy analysis', icon: 'copy', disabled: !this.canAct() },
      { id: 'delete', label: 'Delete analysis', icon: 'delete', tone: 'danger', disabled: !this.canAct() }
    ];
  });

  selectAction(id: string): void {
    const card = this.card();
    if (id === 'details') this.detailsRequested.emit(card);
    if (id === 'compare') this.comparisonToggled.emit(card);
    if (id === 'copy') this.copyRequested.emit(card);
    if (id === 'active') this.activeRequested.emit(card);
    if (id === 'delete') this.deleteRequested.emit(card);
  }
}
