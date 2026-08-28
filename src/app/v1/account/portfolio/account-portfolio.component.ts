import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { ModalPortalService } from '../../shell/modal-portal.service';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';
import { PortfolioFacilityService } from './portfolio-facility.service';

type PortfolioStatusFilter = 'all' | 'attention' | 'noMeters' | 'noReadings' | 'noAnalyses';
type PortfolioSort = 'attention' | 'facilityName' | 'modified';
type PortfolioTone = 'success' | 'warning' | 'danger';

interface PortfolioMetric {
  readonly label: string;
  readonly value: string;
}

interface PortfolioFacilitySummary {
  readonly facility: IdbFacility;
  readonly location: string;
  readonly classification: string;
  readonly unitSummary: string;
  readonly stalenessLabel: string;
  readonly meterCount: number;
  readonly readingCount: number;
  readonly predictorCount: number;
  readonly analysisCount: number;
  readonly reportCount: number;
  readonly equipmentCount: number;
  readonly issueCount: number;
  readonly statusLabel: string;
  readonly statusTone: PortfolioTone;
  readonly statusRank: number;
  readonly latestActivityLabel: string;
  readonly latestActivitySortValue: number;
  readonly noMeters: boolean;
  readonly noReadings: boolean;
  readonly noAnalyses: boolean;
  readonly metrics: readonly PortfolioMetric[];
}

interface PortfolioTotals {
  readonly facilities: number;
  readonly meters: number;
  readonly predictors: number;
  readonly analyses: number;
  readonly reports: number;
  readonly attention: number;
}

@Component({
  selector: 'app-account-portfolio',
  templateUrl: './account-portfolio.component.html',
  styleUrls: ['./account-portfolio.component.css'],
  standalone: false
})
export class AccountPortfolioComponent implements OnDestroy {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly router = inject(Router);
  private readonly portfolioFacilities = inject(PortfolioFacilityService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('createFacilityDrawer') private readonly createFacilityDrawer!: TemplateRef<unknown>;

  readonly navigation = inject(WorkspaceNavigationService);
  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly search = signal('');
  readonly statusFilter = signal<PortfolioStatusFilter>('all');
  readonly sortBy = signal<PortfolioSort>('attention');
  readonly isCreateFacilityDrawerOpen = signal(false);
  readonly facilityToDelete = signal<IdbFacility | undefined>(undefined);

  actionMessage = '';
  actionError = '';
  isDeleting = false;

  ngOnDestroy(): void {
    this.modalPortal.hide();
  }

  readonly facilitySummaries = computed<PortfolioFacilitySummary[]>(() => {
    const meters = this.workspace.meters();
    const meterData = this.workspace.meterData();
    const predictors = this.workspace.predictors();
    const predictorData = this.workspace.predictorData();
    const analyses = this.workspace.facilityAnalyses();
    const reports = this.workspace.facilityReports();
    const equipment = this.workspace.energyUseEquipment();

    return this.workspace.facilities().map(facility => this.buildFacilitySummary(
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

  readonly totals = computed<PortfolioTotals>(() => {
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

  readonly filteredSummaries = computed<PortfolioFacilitySummary[]>(() => {
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
    this.statusFilter.set(value as PortfolioStatusFilter);
  }

  setSortBy(value: string): void {
    this.sortBy.set(value as PortfolioSort);
  }

  openCreateFacilityDrawer(): void {
    if (!this.canWrite() || this.hasPending()) {
      return;
    }
    this.actionError = '';
    this.isCreateFacilityDrawerOpen.set(true);
    this.modalPortal.show(new TemplatePortal(this.createFacilityDrawer, this.viewContainerRef));
  }

  closeCreateFacilityDrawer(): void {
    this.isCreateFacilityDrawerOpen.set(false);
    this.modalPortal.hide();
  }

  openFacility(facility: IdbFacility): void {
    void this.navigation.openFacility(facility.guid);
  }

  openFacilitySettings(facility: IdbFacility): void {
    this.workspaceService.selectFacility(facility.guid);
    void this.router.navigate(this.navigation.facilitySettingsRoute(facility.guid));
  }

  openDeleteFacility(facility: IdbFacility): void {
    if (!this.canWrite() || this.hasPending()) {
      return;
    }
    this.actionError = '';
    this.facilityToDelete.set(facility);
  }

  cancelDeleteFacility(): void {
    if (!this.isDeleting) {
      this.facilityToDelete.set(undefined);
    }
  }

  async confirmDeleteFacility(): Promise<void> {
    const facility = this.facilityToDelete();
    if (!facility || !this.canWrite() || this.hasPending() || this.isDeleting) {
      return;
    }
    this.actionMessage = 'Deleting facility';
    this.actionError = '';
    this.isDeleting = true;
    try {
      await this.portfolioFacilities.deleteFacility(facility);
      this.facilityToDelete.set(undefined);
      this.actionMessage = 'Facility deleted';
    } catch (error) {
      console.warn('v1 portfolio facility delete failed.', error);
      this.actionMessage = '';
      this.actionError = 'Facility could not be deleted. Please try again.';
    } finally {
      this.isDeleting = false;
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
  ): PortfolioFacilitySummary {
    const noMeters = meters.length === 0;
    const noReadings = meters.length > 0 && meterData.length === 0;
    const noAnalyses = analyses.length === 0;
    const issueCount = [noMeters, noReadings, noAnalyses].filter(Boolean).length;
    const latestActivity = this.getLatestActivity([facility], meters, meterData, predictors, predictorData, analyses, reports, equipment);

    return {
      facility,
      location: this.formatLocation(facility),
      classification: facility.classification || 'Unclassified',
      unitSummary: `${facility.energyUnit || 'Energy'} / ${facility.electricityUnit || 'Electricity'}`,
      stalenessLabel: facility.dataStalenessSettings?.useAccountSettings ? 'Uses account staleness' : 'Facility staleness',
      meterCount: meters.length,
      readingCount: meterData.length,
      predictorCount: predictors.length,
      analysisCount: analyses.length,
      reportCount: reports.length,
      equipmentCount: equipment.length,
      issueCount,
      statusLabel: this.getStatusLabel(noMeters, noReadings, noAnalyses),
      statusTone: this.getStatusTone(noMeters, noReadings, noAnalyses),
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

  private matchesSearch(summary: PortfolioFacilitySummary, search: string): boolean {
    if (!search) {
      return true;
    }
    return summary.facility.name.toLowerCase().includes(search)
      || summary.location.toLowerCase().includes(search)
      || summary.classification.toLowerCase().includes(search);
  }

  private matchesStatusFilter(summary: PortfolioFacilitySummary, filter: PortfolioStatusFilter): boolean {
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

  private compareSummaries(first: PortfolioFacilitySummary, second: PortfolioFacilitySummary): number {
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
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

  private getStatusTone(noMeters: boolean, noReadings: boolean, noAnalyses: boolean): PortfolioTone {
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
}
