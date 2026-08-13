import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { IdbFacility, getNewIdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { P1StatusTone } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';

type P1FacilityStatusFilter = 'all' | 'attention' | 'noMeters' | 'noReadings' | 'noAnalyses';
type P1FacilitySort = 'attention' | 'facilityName' | 'modified';

interface P1FacilityMetric {
  label: string;
  value: string;
}

interface P1AccountFacilitySummary {
  facility: IdbFacility;
  location: string;
  classification: string;
  meterCount: number;
  readingCount: number;
  predictorCount: number;
  predictorReadingCount: number;
  analysisCount: number;
  reportCount: number;
  equipmentCount: number;
  issueCount: number;
  statusLabel: string;
  statusTone: P1StatusTone;
  statusRank: number;
  latestActivityLabel: string;
  latestActivitySortValue: number;
  noMeters: boolean;
  noReadings: boolean;
  noAnalyses: boolean;
  metrics: P1FacilityMetric[];
}

interface P1AccountFacilitiesTotals {
  facilities: number;
  meters: number;
  predictors: number;
  analyses: number;
  reports: number;
  attention: number;
}

@Component({
  selector: 'app-p1-account-facilities-data-page',
  templateUrl: './account-facilities-data-page.component.html',
  styleUrls: ['./account-facilities-data-page.component.css'],
  standalone: false
})
export class P1AccountFacilitiesDataPageComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly router = inject(Router);
  private readonly facade = inject(P1RouteFacade);

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly panelTab = computed(() => this.facade.activePanelTab() || 'help');
  readonly search = signal('');
  readonly statusFilter = signal<P1FacilityStatusFilter>('all');
  readonly sortBy = signal<P1FacilitySort>('attention');

  facilityToDelete = signal<IdbFacility | undefined>(undefined);
  actionMessage = '';
  actionError = '';

  readonly facilitySummaries = computed<P1AccountFacilitySummary[]>(() => {
    const meters = this.workspace.meters();
    const meterData = this.workspace.meterData();
    const predictors = this.workspace.predictors();
    const predictorData = this.workspace.predictorData();
    const analyses = this.workspace.facilityAnalyses();
    const reports = this.workspace.facilityReports();
    const equipment = this.workspace.energyUseEquipment();
    return this.workspace.facilities()
      .map(facility => this.buildFacilitySummary(
        facility,
        meters.filter(meter => meter.facilityId === facility.guid),
        meterData.filter(reading => reading.facilityId === facility.guid),
        predictors.filter(predictor => predictor.facilityId === facility.guid),
        predictorData.filter(reading => reading.facilityId === facility.guid),
        analyses.filter(analysis => analysis.facilityId === facility.guid),
        reports.filter(report => report.facilityId === facility.guid),
        equipment.filter(item => item.facilityId === facility.guid)
      ));
  });

  readonly totals = computed<P1AccountFacilitiesTotals>(() => {
    const summaries = this.facilitySummaries();
    return {
      facilities: summaries.length,
      meters: summaries.reduce((sum, summary) => sum + summary.meterCount, 0),
      predictors: summaries.reduce((sum, summary) => sum + summary.predictorCount, 0),
      analyses: summaries.reduce((sum, summary) => sum + summary.analysisCount, 0),
      reports: summaries.reduce((sum, summary) => sum + summary.reportCount, 0),
      attention: summaries.filter(summary => summary.issueCount > 0).length
    };
  });

  readonly filteredSummaries = computed<P1AccountFacilitySummary[]>(() => {
    const search = this.search().trim().toLowerCase();
    const statusFilter = this.statusFilter();
    return this.facilitySummaries()
      .filter(summary => this.matchesSearch(summary, search))
      .filter(summary => this.matchesStatusFilter(summary, statusFilter))
      .sort((first, second) => this.compareSummaries(first, second));
  });

  setSearch(value: string): void {
    this.search.set(value);
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value as P1FacilityStatusFilter);
  }

  setSortBy(value: string): void {
    this.sortBy.set(value as P1FacilitySort);
  }

  openFacility(facility: IdbFacility): void {
    void this.router.navigate(['/p1', 'workspace', 'facility', facility.guid, 'home', 'overview', this.panelTab()]);
  }

  async addFacility(): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite() || this.hasPending()) {
      return;
    }
    this.actionError = '';
    this.actionMessage = 'Adding facility';
    try {
      const facility = getNewIdbFacility(account);
      const result = await this.commandBoundary.execute(
        { entityKind: 'facility', changeKind: 'add', entityGuid: facility.guid, label: 'Adding facility' },
        () => this.facilityHandler.add(
          facility,
          account.guid,
          this.workspace.accountAnalyses(),
          this.workspace.accountReports()
        )
      );
      this.actionMessage = 'Facility added';
      await this.router.navigate([
        '/p1',
        'workspace',
        'facility',
        result.value.facility.guid,
        'settings',
        'profile',
        this.panelTab()
      ]);
    } catch (error) {
      this.actionMessage = '';
      this.actionError = 'Facility could not be added. Please try again.';
      console.warn('P1 facility add failed.', error);
    }
  }

  openDeleteFacility(facility: IdbFacility): void {
    if (!this.canWrite() || this.hasPending()) {
      return;
    }
    this.actionError = '';
    this.facilityToDelete.set(facility);
  }

  cancelDeleteFacility(): void {
    if (!this.hasPending()) {
      this.facilityToDelete.set(undefined);
    }
  }

  async confirmDeleteFacility(): Promise<void> {
    const account = this.account();
    const facility = this.facilityToDelete();
    if (!account || !facility || !this.canWrite() || this.hasPending()) {
      return;
    }
    this.actionError = '';
    this.actionMessage = 'Deleting facility';
    try {
      await this.commandBoundary.execute(
        { entityKind: 'facility', changeKind: 'delete', entityGuid: facility.guid, label: 'Deleting facility' },
        () => this.facilityHandler.delete(facility, account.guid)
      );
      this.facilityToDelete.set(undefined);
      this.actionMessage = 'Facility deleted';
    } catch (error) {
      this.actionMessage = '';
      this.actionError = 'Facility could not be deleted. Please try again.';
      console.warn('P1 facility delete failed.', error);
    }
  }

  private buildFacilitySummary(
    facility: IdbFacility,
    meters: readonly IdbUtilityMeter[],
    meterData: readonly IdbUtilityMeterData[],
    predictors: readonly IdbPredictor[],
    predictorData: readonly IdbPredictorData[],
    analyses: readonly IdbAnalysisItem[],
    reports: readonly IdbFacilityReport[],
    equipment: readonly IdbFacilityEnergyUseEquipment[]
  ): P1AccountFacilitySummary {
    const noMeters = meters.length === 0;
    const noReadings = meters.length > 0 && meterData.length === 0;
    const noAnalyses = analyses.length === 0;
    const issueCount = [noMeters, noReadings, noAnalyses].filter(Boolean).length;
    const statusTone = this.getStatusTone(noMeters, noReadings, noAnalyses);
    const latestActivity = this.getLatestActivity([facility], meters, meterData, predictors, predictorData, analyses, reports, equipment);
    return {
      facility,
      location: this.formatLocation(facility),
      classification: facility.classification || 'Unclassified',
      meterCount: meters.length,
      readingCount: meterData.length,
      predictorCount: predictors.length,
      predictorReadingCount: predictorData.length,
      analysisCount: analyses.length,
      reportCount: reports.length,
      equipmentCount: equipment.length,
      issueCount,
      statusLabel: this.getStatusLabel(noMeters, noReadings, noAnalyses),
      statusTone,
      statusRank: this.getStatusRank(noMeters, noReadings, noAnalyses),
      latestActivityLabel: latestActivity ? this.formatDate(latestActivity) : 'No activity',
      latestActivitySortValue: latestActivity ? latestActivity.getTime() : 0,
      noMeters,
      noReadings,
      noAnalyses,
      metrics: [
        { label: 'Meters', value: String(meters.length) },
        { label: 'Readings', value: String(meterData.length) },
        { label: 'Predictors', value: String(predictors.length) },
        { label: 'Analyses', value: String(analyses.length) }
      ]
    };
  }

  private matchesSearch(summary: P1AccountFacilitySummary, search: string): boolean {
    if (!search) {
      return true;
    }
    return summary.facility.name.toLowerCase().includes(search)
      || summary.location.toLowerCase().includes(search)
      || summary.classification.toLowerCase().includes(search);
  }

  private matchesStatusFilter(summary: P1AccountFacilitySummary, filter: P1FacilityStatusFilter): boolean {
    switch (filter) {
      case 'attention':
        return summary.issueCount > 0;
      case 'noMeters':
        return summary.noMeters;
      case 'noReadings':
        return summary.noReadings;
      case 'noAnalyses':
        return summary.noAnalyses;
      default:
        return true;
    }
  }

  private compareSummaries(first: P1AccountFacilitySummary, second: P1AccountFacilitySummary): number {
    if (this.sortBy() === 'facilityName') {
      return first.facility.name.localeCompare(second.facility.name);
    }
    if (this.sortBy() === 'modified') {
      return second.latestActivitySortValue - first.latestActivitySortValue
        || first.facility.name.localeCompare(second.facility.name);
    }
    return first.statusRank - second.statusRank
      || first.facility.name.localeCompare(second.facility.name);
  }

  private getStatusLabel(noMeters: boolean, noReadings: boolean, noAnalyses: boolean): string {
    if (noMeters) {
      return 'Needs meters';
    }
    if (noReadings) {
      return 'Needs readings';
    }
    if (noAnalyses) {
      return 'Ready for analysis';
    }
    return 'Set up';
  }

  private getStatusTone(noMeters: boolean, noReadings: boolean, noAnalyses: boolean): P1StatusTone {
    if (noMeters) {
      return 'danger';
    }
    if (noReadings || noAnalyses) {
      return 'warning';
    }
    return 'success';
  }

  private getStatusRank(noMeters: boolean, noReadings: boolean, noAnalyses: boolean): number {
    if (noMeters) {
      return 0;
    }
    if (noReadings) {
      return 1;
    }
    if (noAnalyses) {
      return 2;
    }
    return 3;
  }

  private formatLocation(facility: IdbFacility): string {
    return [facility.city, facility.state, facility.country].filter(Boolean).join(', ') || 'No location set';
  }

  private getLatestActivity(...groups: Array<readonly unknown[]>): Date | undefined {
    return groups.flat()
      .map(item => this.coerceDate(this.readModifiedDate(item)))
      .filter((date): date is Date => !!date)
      .sort((first, second) => second.getTime() - first.getTime())[0];
  }

  private readModifiedDate(item: unknown): Date | string | undefined {
    if (item && typeof item === 'object' && 'modifiedDate' in item) {
      return (item as { modifiedDate?: Date | string }).modifiedDate;
    }
    return undefined;
  }

  private coerceDate(value: Date | string | undefined): Date | undefined {
    if (!value) {
      return undefined;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }
}
