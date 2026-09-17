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
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { PortfolioFacilityService } from '../portfolio-facility.service';

type FacilityStatusFilter = 'all' | 'attention' | 'noMeters' | 'noReadings' | 'noAnalyses';
type FacilitySort = 'attention' | 'facilityName' | 'modified';
type FacilityTone = 'success' | 'warning' | 'danger';
type FacilityDataDetail = 'meters' | 'predictors' | 'energy-uses';

interface FacilityFact {
  readonly label: string;
  readonly value: string;
  readonly icon: IconName;
  readonly detail?: FacilityDataDetail;
}

interface FacilitySummary {
  readonly facility: IdbFacility;
  readonly location: string;
  readonly classification: string;
  readonly issueCount: number;
  readonly statusLabel: string;
  readonly statusTone: FacilityTone;
  readonly statusRank: number;
  readonly latestActivityLabel: string;
  readonly latestActivitySortValue: number;
  readonly noMeters: boolean;
  readonly noReadings: boolean;
  readonly noAnalyses: boolean;
  readonly facts: readonly FacilityFact[];
}

@Component({
  selector: 'app-account-portfolio-facilities-tab',
  templateUrl: './account-portfolio-facilities-tab.component.html',
  styleUrls: ['./account-portfolio-facilities-tab.component.css'],
  standalone: false
})
export class AccountPortfolioFacilitiesTabComponent implements OnDestroy {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly portfolioFacilities = inject(PortfolioFacilityService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('deleteFacilityModal') private readonly deleteFacilityModal!: TemplateRef<unknown>;

  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly search = signal('');
  readonly statusFilter = signal<FacilityStatusFilter>('all');
  readonly sortBy = signal<FacilitySort>('attention');
  readonly facilityToDelete = signal<IdbFacility | undefined>(undefined);

  actionMessage = '';
  actionError = '';
  isDeleting = false;

  readonly facilitySummaries = computed<FacilitySummary[]>(() => {
    const metersByFacility = this.groupByFacilityId(this.workspace.meters());
    const meterDataByFacility = this.groupByFacilityId(this.workspace.meterData());
    const predictorsByFacility = this.groupByFacilityId(this.workspace.predictors());
    const predictorDataByFacility = this.groupByFacilityId(this.workspace.predictorData());
    const analysesByFacility = this.groupByFacilityId(this.workspace.facilityAnalyses());
    const reportsByFacility = this.groupByFacilityId(this.workspace.facilityReports());
    const equipmentByFacility = this.groupByFacilityId(this.workspace.energyUseEquipment());

    return this.workspace.facilities().map(facility => this.buildFacilitySummary(
      facility,
      metersByFacility.get(facility.guid) || [],
      meterDataByFacility.get(facility.guid) || [],
      predictorsByFacility.get(facility.guid) || [],
      predictorDataByFacility.get(facility.guid) || [],
      analysesByFacility.get(facility.guid) || [],
      reportsByFacility.get(facility.guid) || [],
      equipmentByFacility.get(facility.guid) || []
    ));
  });

  readonly filteredSummaries = computed<FacilitySummary[]>(() => {
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
    if (this.isStatusFilter(value)) {
      this.statusFilter.set(value);
    }
  }

  setSortBy(value: string): void {
    if (this.isFacilitySort(value)) {
      this.sortBy.set(value);
    }
  }

  openFacility(facility: IdbFacility): void {
    void this.navigation.openFacility(facility.guid);
  }

  openFacilitySettings(facility: IdbFacility): void {
    this.workspaceService.selectFacility(facility.guid);
    void this.router.navigate(this.navigation.facilitySettingsRoute(facility.guid));
  }

  openFacilityData(facility: IdbFacility, detail: FacilityDataDetail): void {
    this.workspaceService.selectFacility(facility.guid);
    void this.router.navigate(this.navigation.facilityDataRoute(facility.guid, detail));
  }

  ngOnDestroy(): void {
    this.modalPortal.hide();
  }

  requestDeleteFacility(facility: IdbFacility): void {
    if (!this.canWrite() || this.hasPending()) {
      return;
    }
    this.actionError = '';
    this.facilityToDelete.set(facility);
    this.modalPortal.show(new TemplatePortal(this.deleteFacilityModal, this.viewContainerRef));
  }

  cancelDeleteFacility(): void {
    if (!this.isDeleting) {
      this.facilityToDelete.set(undefined);
      this.modalPortal.hide();
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
      this.modalPortal.hide();
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
  ): FacilitySummary {
    const noMeters = meters.length === 0;
    const noReadings = meters.length > 0 && meterData.length === 0;
    const noAnalyses = analyses.length === 0;
    const issueCount = [noMeters, noReadings, noAnalyses].filter(Boolean).length;
    const latestActivity = this.getLatestActivity([facility], meters, meterData, predictors, predictorData, analyses, reports, equipment);

    return {
      facility,
      location: this.formatLocation(facility),
      classification: facility.classification || 'Unclassified',
      issueCount,
      statusLabel: this.getStatusLabel(noMeters, noReadings, noAnalyses),
      statusTone: this.getStatusTone(noMeters, noReadings, noAnalyses),
      statusRank: this.getStatusRank(noMeters, noReadings, noAnalyses),
      latestActivityLabel: latestActivity ? this.formatDate(latestActivity) : 'No activity',
      latestActivitySortValue: latestActivity ? latestActivity.getTime() : 0,
      noMeters,
      noReadings,
      noAnalyses,
      facts: [
        { label: 'Meters', value: String(meters.length), icon: 'meter', detail: 'meters' },
        { label: 'Predictors', value: String(predictors.length), icon: 'chartLine', detail: 'predictors' },
        { label: 'Energy Uses', value: String(equipment.length), icon: 'tools', detail: 'energy-uses' },
        { label: 'Analyses', value: String(analyses.length), icon: 'barChart' },
        { label: 'Reports', value: String(reports.length), icon: 'reports' }
      ]
    };
  }

  private groupByFacilityId<T extends { readonly facilityId: string }>(items: readonly T[]): Map<string, T[]> {
    return items.reduce((groups, item) => {
      const facilityItems = groups.get(item.facilityId) || [];
      facilityItems.push(item);
      groups.set(item.facilityId, facilityItems);
      return groups;
    }, new Map<string, T[]>());
  }

  private matchesSearch(summary: FacilitySummary, search: string): boolean {
    if (!search) {
      return true;
    }
    return summary.facility.name.toLowerCase().includes(search)
      || summary.location.toLowerCase().includes(search)
      || summary.classification.toLowerCase().includes(search);
  }

  private matchesStatusFilter(summary: FacilitySummary, filter: FacilityStatusFilter): boolean {
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

  private compareSummaries(first: FacilitySummary, second: FacilitySummary): number {
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

  private getStatusTone(noMeters: boolean, noReadings: boolean, noAnalyses: boolean): FacilityTone {
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

  private isStatusFilter(value: string): value is FacilityStatusFilter {
    return ['all', 'attention', 'noMeters', 'noReadings', 'noAnalyses'].includes(value);
  }

  private isFacilitySort(value: string): value is FacilitySort {
    return ['attention', 'facilityName', 'modified'].includes(value);
  }
}
