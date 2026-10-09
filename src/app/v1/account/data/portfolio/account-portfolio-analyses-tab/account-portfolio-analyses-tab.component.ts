import { Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { buildFacilityAnalysisResourceView } from '@app/v1/facility/analysis/facility-analysis-dashboard/analysis-browse-card/facility-analysis-card.view';
import {
  buildFacilityAnalysisCards,
  FacilityAnalysisCard
} from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis.models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import {
  ResourceBrowseCardCapabilities,
  ResourceBrowseCardView
} from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';

type PortfolioAnalysisCategoryFilter = 'all' | 'energy' | 'water';
type PortfolioAnalysisStatusFilter = 'all' | 'ready' | 'warning' | 'error' | 'active';
type PortfolioAnalysisSort = 'attention' | 'modified' | 'name' | 'facility' | 'baseline';

interface PortfolioAnalysisCard {
  readonly card: FacilityAnalysisCard;
  readonly facility: IdbFacility;
  readonly view: ResourceBrowseCardView;
}

@Component({
  selector: 'app-account-portfolio-analyses-tab',
  templateUrl: './account-portfolio-analyses-tab.component.html',
  styleUrls: ['./account-portfolio-analyses-tab.component.css'],
  standalone: false
})
export class AccountPortfolioAnalysesTabComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);

  readonly cardCapabilities: ResourceBrowseCardCapabilities = { canOpen: true, canAct: false };
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    category: new FormControl<PortfolioAnalysisCategoryFilter>('all', { nonNullable: true }),
    status: new FormControl<PortfolioAnalysisStatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<PortfolioAnalysisSort>('attention', { nonNullable: true })
  });
  readonly filters = toSignal(this.filtersForm.valueChanges, { initialValue: this.filtersForm.getRawValue() });
  readonly analysisCards = computed<PortfolioAnalysisCard[]>(() => {
    const analyses = this.workspace.facilityAnalyses();
    const meterGroups = this.workspace.meterGroups();
    const reports = this.workspace.facilityReports();
    const accountAnalyses = this.workspace.accountAnalyses();
    const statusItems = this.status.items();
    const statusState = this.status.state();

    return this.workspace.facilities().flatMap(facility => buildFacilityAnalysisCards({
      analyses: analyses.filter(analysis => analysis.facilityId === facility.guid),
      accountAnalyses,
      reports: reports.filter(report => report.facilityId === facility.guid),
      meterGroups: meterGroups.filter(group => group.facilityId === facility.guid),
      facility,
      statusItems,
      statusState
    }).map(card => ({
      card,
      facility,
      view: buildFacilityAnalysisResourceView(card, { facility })
    })));
  });
  readonly filteredAnalysisCards = computed<PortfolioAnalysisCard[]>(() => {
    const filters = this.filters();
    const search = filters.search.trim().toLocaleLowerCase();
    return this.analysisCards()
      .filter(entry => !search
        || entry.card.searchText.includes(search)
        || entry.facility.name.toLocaleLowerCase().includes(search))
      .filter(entry => filters.category === 'all' || entry.card.category === filters.category)
      .filter(entry => filters.status === 'all'
        || (filters.status === 'active' ? entry.card.isActiveForReporting : entry.card.status === filters.status))
      .sort((first, second) => this.compareCards(first, second, filters.sort));
  });

  open(entry: PortfolioAnalysisCard): void {
    void this.router.navigate(this.navigation.facilityAnalysisWorkbenchRoute(
      entry.facility.guid,
      entry.card.analysis.guid
    ));
  }

  private compareCards(
    first: PortfolioAnalysisCard,
    second: PortfolioAnalysisCard,
    sort: PortfolioAnalysisSort
  ): number {
    if (sort === 'modified') {
      return second.card.modifiedSortValue - first.card.modifiedSortValue || compareName(first, second);
    }
    if (sort === 'name') {
      return compareName(first, second) || compareFacility(first, second);
    }
    if (sort === 'facility') {
      return compareFacility(first, second) || compareName(first, second);
    }
    if (sort === 'baseline') {
      return (first.card.analysis.baselineYear ?? Infinity) - (second.card.analysis.baselineYear ?? Infinity)
        || compareName(first, second);
    }
    return first.card.attentionRank - second.card.attentionRank
      || compareFacility(first, second)
      || compareName(first, second);
  }
}

function compareName(first: PortfolioAnalysisCard, second: PortfolioAnalysisCard): number {
  return first.card.analysis.name.localeCompare(second.card.analysis.name);
}

function compareFacility(first: PortfolioAnalysisCard, second: PortfolioAnalysisCard): number {
  return first.facility.name.localeCompare(second.facility.name);
}
