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
import { buildAccountAnalysisCards, AccountAnalysisCard } from '@app/v1/account/analysis/account-analysis-dashboard/account-analysis.models';
import { buildAccountAnalysisResourceView } from '@app/v1/account/analysis/account-analysis-dashboard/account-analysis-browse-card/account-analysis-card.view';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';

type PortfolioAnalysisScopeFilter = 'all' | 'account' | 'facility';
type PortfolioAnalysisCategoryFilter = 'all' | 'energy' | 'water';
type PortfolioAnalysisStatusFilter = 'all' | 'ready' | 'warning' | 'error' | 'active';
type PortfolioAnalysisSort = 'attention' | 'modified' | 'name' | 'facility' | 'baseline';

interface PortfolioAnalysisCardContext {
  readonly key: string;
  readonly ownerName: string;
  readonly searchText: string;
  readonly view: ResourceBrowseCardView;
}

type PortfolioAnalysisCard = PortfolioAnalysisCardContext & (
  | { readonly scope: 'account'; readonly card: AccountAnalysisCard }
  | { readonly scope: 'facility'; readonly card: FacilityAnalysisCard; readonly facility: IdbFacility }
);

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

  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    scope: new FormControl<PortfolioAnalysisScopeFilter>('all', { nonNullable: true }),
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

    const account = this.workspace.account();
    const accountCards: PortfolioAnalysisCard[] = account && !account.isSingleFacilityCompany ? buildAccountAnalysisCards({
      account, analyses: accountAnalyses, facilities: this.workspace.facilities(), facilityAnalyses: analyses,
      reports: this.workspace.accountReports(), statusItems, statusState
    }).map(card => ({
      scope: 'account', key: `account:${card.analysis.guid}`, card,
      ownerName: account.name || 'Account',
      searchText: `Account analysis ${account.name || ''} ${card.searchText}`.toLocaleLowerCase(),
      view: portfolioAnalysisView('account', account.name || 'Account', buildAccountAnalysisResourceView(card))
    })) : [];
    const facilityCards: PortfolioAnalysisCard[] = this.workspace.facilities().flatMap(facility => buildFacilityAnalysisCards({
      analyses: analyses.filter(analysis => analysis.facilityId === facility.guid),
      accountAnalyses,
      reports: reports.filter(report => report.facilityId === facility.guid),
      meterGroups: meterGroups.filter(group => group.facilityId === facility.guid),
      facility,
      statusItems,
      statusState
    }).map(card => ({
      scope: 'facility' as const, key: `facility:${card.analysis.guid}`, card, facility,
      ownerName: facility.name || 'Unnamed facility',
      searchText: `Facility analysis ${facility.name || ''} ${card.searchText}`.toLocaleLowerCase(),
      view: portfolioAnalysisView('facility', facility.name || 'Unnamed facility', buildFacilityAnalysisResourceView(card, { facility }))
    })));
    return [...accountCards, ...facilityCards];
  });
  readonly filteredAnalysisCards = computed<PortfolioAnalysisCard[]>(() => {
    const filters = this.filters();
    const search = filters.search.trim().toLocaleLowerCase();
    return this.analysisCards()
      .filter(entry => filters.scope === 'all' || entry.scope === filters.scope)
      .filter(entry => !search || entry.searchText.includes(search))
      .filter(entry => filters.category === 'all' || entry.card.category === filters.category)
      .filter(entry => filters.status === 'all'
        || (filters.status === 'active' ? entry.card.isActiveForReporting : entry.card.status === filters.status))
      .sort((first, second) => this.compareCards(first, second, filters.sort));
  });

  open(entry: PortfolioAnalysisCard): void {
    if (entry.scope === 'account') {
      void this.router.navigate(this.navigation.accountAnalysisWorkbenchRoute(entry.card.analysis.accountId, entry.card.analysis.guid));
      return;
    }
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
      return compareName(first, second) || compareOwner(first, second);
    }
    if (sort === 'facility') {
      return compareOwner(first, second) || compareName(first, second);
    }
    if (sort === 'baseline') {
      return (first.card.analysis.baselineYear ?? Infinity) - (second.card.analysis.baselineYear ?? Infinity)
        || compareName(first, second);
    }
    return first.card.attentionRank - second.card.attentionRank
      || compareOwner(first, second)
      || compareName(first, second);
  }
}

function compareName(first: PortfolioAnalysisCard, second: PortfolioAnalysisCard): number {
  return first.card.analysis.name.localeCompare(second.card.analysis.name);
}

function compareOwner(first: PortfolioAnalysisCard, second: PortfolioAnalysisCard): number {
  return first.scope.localeCompare(second.scope) || first.ownerName.localeCompare(second.ownerName);
}

function portfolioAnalysisView(
  scope: 'account' | 'facility',
  ownerName: string,
  view: ResourceBrowseCardView
): ResourceBrowseCardView {
  const scopeLabel = scope === 'account' ? 'Account analysis' : 'Facility analysis';
  return {
    ...view,
    openLabel: `Open ${view.title}, ${scopeLabel.toLocaleLowerCase()} for ${ownerName}`,
    owner: { label: ownerName, icon: scope === 'account' ? 'account' : 'facility',
      accentColor: scope === 'account' ? 'var(--v1-account)' : 'var(--v1-facility)' },
    chips: [{ id: 'scope', label: scopeLabel, icon: scope === 'account' ? 'account' : 'facility',
      accentColor: scope === 'account' ? 'var(--v1-account)' : 'var(--v1-facility)' }, ...(view.chips ?? [])]
  };
}
