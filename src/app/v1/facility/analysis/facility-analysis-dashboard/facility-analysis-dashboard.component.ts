import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AnalysisBrowseCardComponent } from './analysis-browse-card/analysis-browse-card.component';
import { FacilityAnalysisWorkspaceService } from '../facility-analysis-workspace.service';
import { FacilityAnalysisCard } from '../facility-analysis.models';

type AnalysisCategoryFilter = 'all' | 'energy' | 'water';
type AnalysisStatusFilter = 'all' | 'ready' | 'warning' | 'error' | 'active';
type AnalysisSort = 'attention' | 'modified' | 'name' | 'baseline';

@Component({
  selector: 'app-facility-analysis-dashboard',
  standalone: true,
  imports: [IconComponent, DataEmptyStateModule, WorkspaceSlideoutComponent, AnalysisBrowseCardComponent],
  templateUrl: './facility-analysis-dashboard.component.html',
  styleUrls: ['./facility-analysis-dashboard.component.css']
})
export class FacilityAnalysisDashboardComponent {
  private readonly router = inject(Router);
  readonly workspace = inject(FacilityAnalysisWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly search = signal('');
  readonly categoryFilter = signal<AnalysisCategoryFilter>('all');
  readonly statusFilter = signal<AnalysisStatusFilter>('all');
  readonly sortBy = signal<AnalysisSort>('attention');
  readonly detailsCard = signal<FacilityAnalysisCard | undefined>(undefined);
  readonly comparisonGuids = signal<readonly string[]>([]);
  readonly comparisonCards = computed(() => this.comparisonGuids()
    .map(guid => this.workspace.cards().find(card => card.analysis.guid === guid))
    .filter((card): card is FacilityAnalysisCard => !!card));
  readonly filteredCards = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();
    const category = this.categoryFilter();
    const status = this.statusFilter();
    return this.workspace.cards()
      .filter(card => !search || card.searchText.includes(search))
      .filter(card => category === 'all' || card.category === category)
      .filter(card => status === 'all' || (status === 'active' ? card.isActiveForReporting : card.status === status))
      .sort((first, second) => this.compareCards(first, second));
  });

  setCategoryFilter(value: string): void { if (['all', 'energy', 'water'].includes(value)) this.categoryFilter.set(value as AnalysisCategoryFilter); }
  setStatusFilter(value: string): void { if (['all', 'ready', 'warning', 'error', 'active'].includes(value)) this.statusFilter.set(value as AnalysisStatusFilter); }
  setSort(value: string): void { if (['attention', 'modified', 'name', 'baseline'].includes(value)) this.sortBy.set(value as AnalysisSort); }

  open(card: FacilityAnalysisCard): void {
    const facility = this.workspace.facility();
    if (facility) void this.router.navigate(this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, card.analysis.guid));
  }

  toggleComparison(card: FacilityAnalysisCard): void {
    const current = this.comparisonGuids();
    if (current.includes(card.analysis.guid)) {
      this.comparisonGuids.set(current.filter(guid => guid !== card.analysis.guid));
      return;
    }
    this.comparisonGuids.set([...current, card.analysis.guid].slice(-2));
  }

  isCompared(guid: string): boolean { return this.comparisonGuids().includes(guid); }
  clearComparison(): void { this.comparisonGuids.set([]); }

  private compareCards(first: FacilityAnalysisCard, second: FacilityAnalysisCard): number {
    if (this.sortBy() === 'modified') return second.modifiedSortValue - first.modifiedSortValue || compareName(first, second);
    if (this.sortBy() === 'name') return compareName(first, second);
    if (this.sortBy() === 'baseline') return (first.analysis.baselineYear ?? Infinity) - (second.analysis.baselineYear ?? Infinity) || compareName(first, second);
    return first.attentionRank - second.attentionRank || compareName(first, second);
  }
}

function compareName(first: FacilityAnalysisCard, second: FacilityAnalysisCard): number { return first.analysis.name.localeCompare(second.analysis.name); }
