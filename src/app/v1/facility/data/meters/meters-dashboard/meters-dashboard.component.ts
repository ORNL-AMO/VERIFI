import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { MeterCardView, MeterDraft } from '@app/v1/facility/data/meters/models';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { MeterDraftSlideoutComponent } from './meter-dashboard-slideout/meter-draft-slideout/meter-draft-slideout.component';
import { MeterBrowseCardComponent } from './meter-browse-card/meter-browse-card.component';
import { MetersDashboardActionsService } from './meters-dashboard-actions.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';

type FacilityMeterStatusFilter = 'all' | 'attention' | 'noReadings' | 'missingGroup' | 'valid';
type FacilityMeterSort = 'attention' | 'meterName' | 'latestReading';

interface FacilityMeterCard {
  readonly card: MeterCardView;
  readonly latestReadingSortValue: number;
  readonly attentionRank: number;
  readonly noReadings: boolean;
  readonly missingGroup: boolean;
  readonly valid: boolean;
  readonly needsAttention: boolean;
}

@Component({
  selector: 'app-meters-dashboard',
  templateUrl: './meters-dashboard.component.html',
  styleUrls: ['./meters-dashboard.component.css'],
  standalone: true,
  imports: [
    IconComponent,
    DataEmptyStateComponent,
    MeterBrowseCardComponent,
    MeterDraftSlideoutComponent,
    RouterLink
  ],
  providers: [MetersDashboardActionsService]
})
export class MetersDashboardComponent {
  private readonly router = inject(Router);
  private readonly actions = inject(MetersDashboardActionsService);

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly addMeterOpen = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly search = signal('');
  readonly statusFilter = signal<FacilityMeterStatusFilter>('all');
  readonly sortBy = signal<FacilityMeterSort>('attention');
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly accountMetersRoute = computed(() => {
    const account = this.workspace.account();
    return account ? [...this.navigation.accountDataRoute(account.guid), 'meters'] : undefined;
  });
  readonly meterCards = computed<FacilityMeterCard[]>(() => this.workspace.meterCards().map(card => {
    const readings = this.workspace.meterData().filter(reading => reading.meterId === card.meter.guid);
    const noReadings = readings.length === 0;
    const missingGroup = !card.group;
    const valid = card.statusTone === 'success';
    return {
      card,
      latestReadingSortValue: readings.reduce((latest, reading) => Math.max(latest, reading.year * 12 + reading.month), 0),
      attentionRank: this.attentionRank(card, noReadings, missingGroup),
      noReadings,
      missingGroup,
      valid,
      needsAttention: noReadings || missingGroup || card.statusTone === 'warning' || card.statusTone === 'danger'
    };
  }));
  readonly filteredMeterCards = computed<FacilityMeterCard[]>(() => {
    const search = this.search().trim().toLowerCase();
    const statusFilter = this.statusFilter();
    return this.meterCards()
      .filter(item => this.matchesSearch(item, search))
      .filter(item => this.matchesStatusFilter(item, statusFilter))
      .sort((first, second) => this.compareMeterCards(first, second));
  });

  setSearch(value: string): void {
    this.search.set(value);
  }

  setStatusFilter(value: string): void {
    if (this.isStatusFilter(value)) {
      this.statusFilter.set(value);
    }
  }

  setSortBy(value: string): void {
    if (this.isMeterSort(value)) {
      this.sortBy.set(value);
    }
  }

  openAddMeter(): void {
    if (this.canAct()) {
      this.addMeterOpen.set(true);
      this.actionError.set(undefined);
    }
  }

  closeAddMeter(): void {
    if (!this.saving()) {
      this.addMeterOpen.set(false);
      this.actionError.set(undefined);
    }
  }

  async saveMeterDraft(draft: MeterDraft): Promise<void> {
    await this.runAction(async () => {
      const meter = await this.actions.createMeter(draft);
      this.addMeterOpen.set(false);
      this.openCreatedMeter(meter.guid);
    });
  }

  private openCreatedMeter(meterGuid: string): void {
    const facility = this.workspace.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meterGuid, 'settings'));
    }
  }

  private matchesSearch(item: FacilityMeterCard, search: string): boolean {
    if (!search) {
      return true;
    }
    return item.card.meter.name.toLowerCase().includes(search)
      || item.card.meter.source.toLowerCase().includes(search)
      || (item.card.group?.name || 'ungrouped').toLowerCase().includes(search)
      || (item.card.statusLabel || '').toLowerCase().includes(search);
  }

  private matchesStatusFilter(item: FacilityMeterCard, filter: FacilityMeterStatusFilter): boolean {
    switch (filter) {
      case 'attention':
        return item.needsAttention;
      case 'noReadings':
        return item.noReadings;
      case 'missingGroup':
        return item.missingGroup;
      case 'valid':
        return item.valid;
      default:
        return true;
    }
  }

  private compareMeterCards(first: FacilityMeterCard, second: FacilityMeterCard): number {
    if (this.sortBy() === 'meterName') {
      return first.card.meter.name.localeCompare(second.card.meter.name);
    }
    if (this.sortBy() === 'latestReading') {
      return second.latestReadingSortValue - first.latestReadingSortValue
        || first.card.meter.name.localeCompare(second.card.meter.name);
    }
    return first.attentionRank - second.attentionRank
      || first.card.meter.name.localeCompare(second.card.meter.name);
  }

  private attentionRank(card: MeterCardView, noReadings: boolean, missingGroup: boolean): number {
    if (card.statusTone === 'danger') {
      return 0;
    }
    if (noReadings) {
      return 1;
    }
    if (card.statusTone === 'warning') {
      return 2;
    }
    if (missingGroup) {
      return 3;
    }
    if (card.statusTone === 'info') {
      return 4;
    }
    return 5;
  }

  private isStatusFilter(value: string): value is FacilityMeterStatusFilter {
    return ['all', 'attention', 'noReadings', 'missingGroup', 'valid'].includes(value);
  }

  private isMeterSort(value: string): value is FacilityMeterSort {
    return ['attention', 'meterName', 'latestReading'].includes(value);
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    if (!this.canAct()) {
      return;
    }
    this.saving.set(true);
    this.actionError.set(undefined);
    try {
      await action();
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'The meter change could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }
}
