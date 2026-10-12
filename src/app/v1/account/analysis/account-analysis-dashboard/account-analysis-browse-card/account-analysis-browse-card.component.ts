import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ResourceBrowseCardComponent } from '@app/v1/shared/resource-browse-card/resource-browse-card.component';
import { ResourceBrowseCardAction } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { AccountAnalysisDashboardCard } from '../account-analysis.models';
import { buildAccountAnalysisResourceView } from './account-analysis-card.view';

@Component({
  selector: 'app-account-analysis-browse-card',
  host: { class: 'v1-resource-browse-card-host' },
  standalone: true,
  imports: [ResourceBrowseCardComponent],
  templateUrl: './account-analysis-browse-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountAnalysisBrowseCardComponent {
  readonly card = input.required<AccountAnalysisDashboardCard>();
  readonly canAct = input(true);
  readonly opened = output<AccountAnalysisDashboardCard>();
  readonly detailsRequested = output<AccountAnalysisDashboardCard>();
  readonly copyRequested = output<AccountAnalysisDashboardCard>();
  readonly activeRequested = output<AccountAnalysisDashboardCard>();
  readonly deleteRequested = output<AccountAnalysisDashboardCard>();
  readonly view = computed(() => buildAccountAnalysisResourceView(this.card()));
  readonly actions = computed<readonly ResourceBrowseCardAction[]>(() => {
    const card = this.card();
    return [
      ...(!card.isActiveForReporting ? [{
        id: 'active', label: 'Set active for reporting', icon: 'target' as const, disabled: !this.canAct()
      }] : []),
      { id: 'details', label: 'View analysis details', icon: 'monocle' },
      { id: 'copy', label: 'Copy analysis', icon: 'copy', disabled: !this.canAct() },
      {
        id: 'delete', label: 'Delete analysis', icon: 'delete', tone: 'danger' as const,
        disabled: !this.canAct() || card.linkedReports.length > 0,
        disabledReason: card.linkedReports.length
          ? 'Remove this analysis from linked reports before deleting it.' : undefined
      }
    ];
  });

  selectAction(id: string): void {
    const card = this.card();
    if (id === 'details') this.detailsRequested.emit(card);
    if (id === 'copy') this.copyRequested.emit(card);
    if (id === 'active') this.activeRequested.emit(card);
    if (id === 'delete') this.deleteRequested.emit(card);
  }
}
