import { Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildMeterCards, MeterCardView } from '@app/v1/facility/data/meters/models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { buildMeterResourceView } from '@app/v1/facility/data/meters/meters-dashboard/meter-browse-card/meter-browse-card.view';

type PortfolioMeterStatusFilter = 'all' | 'attention' | 'noReadings' | 'missingGroup' | 'valid';
type PortfolioMeterSort = 'attention' | 'meterName' | 'facilityName' | 'latestReading';

interface PortfolioMeterCard {
  readonly card: MeterCardView;
  readonly facility: IdbFacility;
  readonly view: ResourceBrowseCardView;
  readonly latestReadingSortValue: number;
  readonly attentionRank: number;
  readonly noReadings: boolean;
  readonly missingGroup: boolean;
  readonly valid: boolean;
  readonly needsAttention: boolean;
}

@Component({
  selector: 'app-account-portfolio-meters-tab',
  templateUrl: './account-portfolio-meters-tab.component.html',
  styleUrls: ['./account-portfolio-meters-tab.component.css'],
  standalone: false
})
export class AccountPortfolioMetersTabComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl<PortfolioMeterStatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<PortfolioMeterSort>('attention', { nonNullable: true })
  });
  readonly filters = toSignal(this.filtersForm.valueChanges, { initialValue: this.filtersForm.getRawValue() });

  readonly meterCards = computed<PortfolioMeterCard[]>(() => {
    const facilities = this.workspace.facilities();
    const meters = this.workspace.meters();
    const meterData = this.workspace.meterData();
    const meterGroups = this.workspace.meterGroups();

    return facilities.flatMap(facility => {
      const facilityMeters = meters.filter(meter => meter.facilityId === facility.guid);
      const facilityMeterData = meterData.filter(reading => reading.facilityId === facility.guid);
      const facilityMeterGroups = meterGroups.filter(group => group.facilityId === facility.guid);
      const findings = this.status.items().filter(item => item.entity.kind === 'meter' && item.entity.facilityGuid === facility.guid);
      return buildMeterCards(facilityMeters, facilityMeterData, facilityMeterGroups, findings, facility, [], this.status.state() === 'ready')
        .map(card => this.buildPortfolioMeterCard(card, facility, facilityMeterData));
    });
  });

  readonly filteredMeterCards = computed<PortfolioMeterCard[]>(() => {
    const search = this.filters().search.trim().toLowerCase();
    const statusFilter = this.filters().status;
    return this.meterCards()
      .filter(item => this.matchesSearch(item, search))
      .filter(item => this.matchesStatusFilter(item, statusFilter))
      .sort((first, second) => this.compareMeterCards(first, second));
  });

  setSearch(value: string): void {
    this.filtersForm.controls.search.setValue(value);
  }

  setStatusFilter(value: string): void {
    if (this.isStatusFilter(value)) {
      this.filtersForm.controls.status.setValue(value);
    }
  }

  setSortBy(value: string): void {
    if (this.isMeterSort(value)) {
      this.filtersForm.controls.sort.setValue(value);
    }
  }

  private buildPortfolioMeterCard(
    card: MeterCardView,
    facility: IdbFacility,
    facilityMeterData: readonly IdbUtilityMeterData[]
  ): PortfolioMeterCard {
    const meterReadings = facilityMeterData.filter(reading => reading.meterId === card.meter.guid);
    const noReadings = meterReadings.length === 0;
    const missingGroup = !card.group;
    const valid = card.statusTone === 'success';
    const needsAttention = noReadings || missingGroup || card.statusTone === 'warning' || card.statusTone === 'danger';
    return {
      card,
      facility,
      view: buildMeterResourceView(card, { facility }),
      latestReadingSortValue: this.latestReadingSortValue(meterReadings),
      attentionRank: this.attentionRank(card, noReadings, missingGroup),
      noReadings,
      missingGroup,
      valid,
      needsAttention
    };
  }

  openMeter(item: PortfolioMeterCard): void {
    void this.router.navigate(this.navigation.facilityMeterRoute(
      item.facility.guid,
      item.card.meter.guid,
      'settings'
    ));
  }

  private matchesSearch(item: PortfolioMeterCard, search: string): boolean {
    if (!search) {
      return true;
    }
    return item.card.meter.name.toLowerCase().includes(search)
      || item.facility.name.toLowerCase().includes(search)
      || item.card.meter.source.toLowerCase().includes(search)
      || (item.card.group?.name || 'ungrouped').toLowerCase().includes(search)
      || (item.card.statusLabel || '').toLowerCase().includes(search);
  }

  private matchesStatusFilter(item: PortfolioMeterCard, filter: PortfolioMeterStatusFilter): boolean {
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

  private compareMeterCards(first: PortfolioMeterCard, second: PortfolioMeterCard): number {
    if (this.filters().sort === 'meterName') {
      return first.card.meter.name.localeCompare(second.card.meter.name)
        || first.facility.name.localeCompare(second.facility.name);
    }
    if (this.filters().sort === 'facilityName') {
      return first.facility.name.localeCompare(second.facility.name)
        || first.card.meter.name.localeCompare(second.card.meter.name);
    }
    if (this.filters().sort === 'latestReading') {
      return second.latestReadingSortValue - first.latestReadingSortValue
        || first.card.meter.name.localeCompare(second.card.meter.name);
    }
    return first.attentionRank - second.attentionRank
      || first.facility.name.localeCompare(second.facility.name)
      || first.card.meter.name.localeCompare(second.card.meter.name);
  }

  private latestReadingSortValue(readings: readonly IdbUtilityMeterData[]): number {
    return readings.reduce((latest, reading) => Math.max(latest, reading.year * 12 + reading.month), 0);
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

  private isStatusFilter(value: string): value is PortfolioMeterStatusFilter {
    return ['all', 'attention', 'noReadings', 'missingGroup', 'valid'].includes(value);
  }

  private isMeterSort(value: string): value is PortfolioMeterSort {
    return ['attention', 'meterName', 'facilityName', 'latestReading'].includes(value);
  }
}
