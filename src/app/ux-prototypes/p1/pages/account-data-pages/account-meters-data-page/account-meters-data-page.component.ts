import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { STATUS_CHECK_OPTIONS } from 'src/app/calculations/status-check-calculations/statusCheckModels';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { P1RouteFacade } from '../../../p1-route.facade';

type P1AccountMeterStatusFilter = 'all' | 'attention' | 'noMeters' | 'noReadings' | 'missingGroups';
type P1AccountMeterSort = 'attention' | 'facilityName' | 'latestReading';
type P1AccountMeterTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface P1FacilityMeterMetric {
  label: string;
  value: string;
}

interface P1FacilityMeterSummary {
  facility: IdbFacility;
  location: string;
  meterCount: number;
  readingCount: number;
  groupCount: number;
  issueCount: number;
  sourceMix: string[];
  extraSourceCount: number;
  latestReadingLabel: string;
  latestReadingSortValue: number;
  statusLabel: string;
  statusTone: P1AccountMeterTone;
  statusRank: number;
  nextAction: string;
  needsAttention: boolean;
  noMeters: boolean;
  noReadings: boolean;
  missingGroups: boolean;
  metrics: P1FacilityMeterMetric[];
}

interface P1AccountMeterTotals {
  facilities: number;
  meters: number;
  readings: number;
  groups: number;
  attention: number;
}

@Component({
  selector: 'app-p1-account-meters-data-page',
  templateUrl: './account-meters-data-page.component.html',
  styleUrls: ['./account-meters-data-page.component.css'],
  standalone: false
})
export class P1AccountMetersDataPageComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly statusCheckService = inject(AccountStatusCheckService);
  private readonly facade = inject(P1RouteFacade);
  private readonly accountStatusCheck = toSignal(this.statusCheckService.accountStatusCheck);

  readonly account = this.workspace.account;
  readonly panelTab = computed(() => this.facade.activePanelTab() || 'help');
  readonly search = signal('');
  readonly statusFilter = signal<P1AccountMeterStatusFilter>('all');
  readonly sortBy = signal<P1AccountMeterSort>('attention');

  readonly facilitySummaries = computed<P1FacilityMeterSummary[]>(() => {
    const meters = this.workspace.meters();
    const meterData = this.workspace.meterData();
    const meterGroups = this.workspace.meterGroups();
    const statusCheck = this.accountStatusCheck();
    return this.workspace.facilities()
      .map(facility => this.buildFacilitySummary(
        facility,
        meters.filter(meter => meter.facilityId === facility.guid),
        meterData.filter(reading => reading.facilityId === facility.guid),
        meterGroups.filter(group => group.facilityId === facility.guid),
        statusCheck?.getFacilityStatusCheckByFacilityId(facility.guid)
      ));
  });

  readonly totals = computed<P1AccountMeterTotals>(() => {
    const summaries = this.facilitySummaries();
    return {
      facilities: summaries.length,
      meters: summaries.reduce((sum, summary) => sum + summary.meterCount, 0),
      readings: summaries.reduce((sum, summary) => sum + summary.readingCount, 0),
      groups: summaries.reduce((sum, summary) => sum + summary.groupCount, 0),
      attention: summaries.filter(summary => summary.needsAttention).length
    };
  });

  readonly filteredSummaries = computed<P1FacilityMeterSummary[]>(() => {
    const search = this.search().trim().toLowerCase();
    const statusFilter = this.statusFilter();
    const sorted = this.facilitySummaries()
      .filter(summary => this.matchesSearch(summary, search))
      .filter(summary => this.matchesStatusFilter(summary, statusFilter))
      .sort((first, second) => this.compareSummaries(first, second));
    return sorted;
  });

  setSearch(value: string): void {
    this.search.set(value);
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value as P1AccountMeterStatusFilter);
  }

  setSortBy(value: string): void {
    this.sortBy.set(value as P1AccountMeterSort);
  }

  ariaLabel(summary: P1FacilityMeterSummary): string {
    return `Open ${summary.facility.name} meters workbench. ${summary.statusLabel}. ${summary.meterCount} meters and ${summary.readingCount} readings.`;
  }

  private buildFacilitySummary(
    facility: IdbFacility,
    meters: IdbUtilityMeter[],
    meterData: IdbUtilityMeterData[],
    meterGroups: IdbUtilityMeterGroup[],
    statusCheck: FacilityStatusCheck | undefined
  ): P1FacilityMeterSummary {
    const issueCount = statusCheck
      ? statusCheck.metersStatusChecks.filter(check => check.status !== 'good').length
      : 0;
    const noMeters = meters.length === 0;
    const noReadings = meters.length > 0 && meterData.length === 0;
    const missingGroups = meters.length > 0 && meterGroups.length === 0;
    const latestReading = this.getLatestReading(meterData);
    const sourceMix = this.getSourceMix(meters);
    const status = statusCheck?.metersStatus;
    const statusLabel = this.getStatusLabel(status, noMeters, noReadings, missingGroups, !!statusCheck);
    const statusTone = this.getStatusTone(status, noMeters, noReadings, missingGroups, !!statusCheck);
    const needsAttention = noMeters || noReadings || missingGroups || issueCount > 0 || (status !== undefined && status !== 'good');
    const summary: P1FacilityMeterSummary = {
      facility,
      location: this.formatLocation(facility),
      meterCount: meters.length,
      readingCount: meterData.length,
      groupCount: meterGroups.length,
      issueCount,
      sourceMix: sourceMix.slice(0, 4),
      extraSourceCount: Math.max(sourceMix.length - 4, 0),
      latestReadingLabel: latestReading ? this.formatReadingDate(latestReading) : 'No readings',
      latestReadingSortValue: latestReading ? this.readingDateValue(latestReading) : 0,
      statusLabel,
      statusTone,
      statusRank: this.getStatusRank(status, noMeters, noReadings, missingGroups, !!statusCheck),
      nextAction: this.getNextAction(status, noMeters, noReadings, missingGroups, issueCount),
      needsAttention,
      noMeters,
      noReadings,
      missingGroups,
      metrics: []
    };
    summary.metrics = [
      { label: 'Meters', value: String(summary.meterCount) },
      { label: 'Readings', value: String(summary.readingCount) },
      { label: 'Groups', value: String(summary.groupCount) },
      { label: 'Issues', value: String(summary.issueCount) }
    ];
    return summary;
  }

  private matchesSearch(summary: P1FacilityMeterSummary, search: string): boolean {
    if (!search) {
      return true;
    }
    return summary.facility.name.toLowerCase().includes(search)
      || summary.location.toLowerCase().includes(search)
      || summary.sourceMix.some(source => source.toLowerCase().includes(search));
  }

  private matchesStatusFilter(summary: P1FacilityMeterSummary, filter: P1AccountMeterStatusFilter): boolean {
    switch (filter) {
      case 'attention':
        return summary.needsAttention;
      case 'noMeters':
        return summary.noMeters;
      case 'noReadings':
        return summary.noReadings;
      case 'missingGroups':
        return summary.missingGroups;
      default:
        return true;
    }
  }

  private compareSummaries(first: P1FacilityMeterSummary, second: P1FacilityMeterSummary): number {
    if (this.sortBy() === 'facilityName') {
      return first.facility.name.localeCompare(second.facility.name);
    }
    if (this.sortBy() === 'latestReading') {
      return second.latestReadingSortValue - first.latestReadingSortValue
        || first.facility.name.localeCompare(second.facility.name);
    }
    return first.statusRank - second.statusRank
      || first.facility.name.localeCompare(second.facility.name);
  }

  private getLatestReading(readings: IdbUtilityMeterData[]): IdbUtilityMeterData | undefined {
    return readings.reduce<IdbUtilityMeterData | undefined>((latest, reading) => {
      if (!latest) {
        return reading;
      }
      return this.readingDateValue(reading) > this.readingDateValue(latest) ? reading : latest;
    }, undefined);
  }

  private getSourceMix(meters: IdbUtilityMeter[]): string[] {
    return [...new Set(meters.map(meter => meter.source).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second));
  }

  private getStatusLabel(
    status: STATUS_CHECK_OPTIONS | undefined,
    noMeters: boolean,
    noReadings: boolean,
    missingGroups: boolean,
    hasStatusCheck: boolean
  ): string {
    if (noMeters) {
      return 'No meters';
    }
    if (noReadings) {
      return 'No readings';
    }
    if (!hasStatusCheck) {
      return 'Status unavailable';
    }
    if (status === 'good') {
      return 'Ready';
    }
    if (status === 'outdated') {
      return 'Outdated data';
    }
    if (status === 'error') {
      return 'Meter issues';
    }
    if (missingGroups) {
      return 'Missing groups';
    }
    return 'Needs review';
  }

  private getStatusTone(
    status: STATUS_CHECK_OPTIONS | undefined,
    noMeters: boolean,
    noReadings: boolean,
    missingGroups: boolean,
    hasStatusCheck: boolean
  ): P1AccountMeterTone {
    if (noMeters || noReadings || status === 'error') {
      return 'danger';
    }
    if (missingGroups || status === 'warning' || status === 'outdated') {
      return 'warning';
    }
    return hasStatusCheck && status === 'good' ? 'success' : 'neutral';
  }

  private getStatusRank(
    status: STATUS_CHECK_OPTIONS | undefined,
    noMeters: boolean,
    noReadings: boolean,
    missingGroups: boolean,
    hasStatusCheck: boolean
  ): number {
    if (noMeters) {
      return 0;
    }
    if (noReadings) {
      return 1;
    }
    if (status === 'error') {
      return 2;
    }
    if (status === 'outdated') {
      return 3;
    }
    if (missingGroups || status === 'warning') {
      return 4;
    }
    return hasStatusCheck && status === 'good' ? 6 : 5;
  }

  private getNextAction(
    status: STATUS_CHECK_OPTIONS | undefined,
    noMeters: boolean,
    noReadings: boolean,
    missingGroups: boolean,
    issueCount: number
  ): string {
    if (noMeters) {
      return 'Add meters';
    }
    if (noReadings) {
      return 'Add readings';
    }
    if (missingGroups) {
      return 'Create meter groups';
    }
    if (issueCount > 0 || (status !== undefined && status !== 'good')) {
      return 'Review meter issues';
    }
    return 'Open meters workbench';
  }

  private formatLocation(facility: IdbFacility): string {
    const cityState = [facility.city, facility.state].filter(Boolean).join(', ');
    return cityState || facility.country || 'Location not set';
  }

  private formatReadingDate(reading: IdbUtilityMeterData): string {
    return new Date(reading.year, reading.month - 1, reading.day || 1)
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  private readingDateValue(reading: IdbUtilityMeterData): number {
    return new Date(reading.year, reading.month - 1, reading.day || 1).getTime();
  }
}
