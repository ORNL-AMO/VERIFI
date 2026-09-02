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
type PortfolioSort = 'facilityName' | 'modified' | 'selectedContent';
type PortfolioContentView = 'facilities' | 'meters' | 'predictors' | 'energyUses' | 'analyses' | 'reports';
type PortfolioTone = 'success' | 'warning' | 'danger';

interface PortfolioMetric {
  readonly label: string;
  readonly value: string;
}

interface PortfolioSelectorSummary {
  readonly id: PortfolioContentView;
  readonly label: string;
  readonly icon: string;
  readonly total: number;
}

interface PortfolioDetail {
  readonly icon: string;
  readonly label: string;
}

interface PortfolioContentSummary {
  readonly metrics: readonly PortfolioMetric[];
  readonly details: readonly PortfolioDetail[];
  readonly emptyMessage?: string;
}

interface PortfolioFacilityCard {
  readonly summary: PortfolioFacilitySummary;
  readonly content: PortfolioContentSummary;
}

interface PortfolioFacilitySummary {
  readonly facility: IdbFacility;
  readonly location: string;
  readonly classification: string;
  readonly meterCount: number;
  readonly readingCount: number;
  readonly meterSourceSummary: string;
  readonly latestMeterActivityLabel: string;
  readonly predictorCount: number;
  readonly predictorTypeSummary: string;
  readonly weatherPredictorCount: number;
  readonly productionPredictorCount: number;
  readonly analysisCount: number;
  readonly energyAnalysisCount: number;
  readonly waterAnalysisCount: number;
  readonly checkedAnalysisCount: number;
  readonly visitedAnalysisCount: number;
  readonly analysisBaselineSummary: string;
  readonly reportCount: number;
  readonly checkedReportCount: number;
  readonly reportTypeSummary: string;
  readonly equipmentCount: number;
  readonly activeEquipmentCount: number;
  readonly inactiveEquipmentCount: number;
  readonly equipmentTypeSummary: string;
  readonly equipmentMeterLinkCount: number;
  readonly issueCount: number;
  readonly statusTone: PortfolioTone;
  readonly statusRank: number;
  readonly latestActivityLabel: string;
  readonly latestActivitySortValue: number;
  readonly noMeters: boolean;
  readonly noReadings: boolean;
  readonly noAnalyses: boolean;
  readonly metrics: readonly PortfolioMetric[];
  readonly selectedContentSortValue: number;
}

interface PortfolioTotals {
  readonly facilities: number;
  readonly meters: number;
  readonly predictors: number;
  readonly energyUses: number;
  readonly analyses: number;
  readonly reports: number;
}

const PORTFOLIO_SELECTORS: ReadonlyArray<Omit<PortfolioSelectorSummary, 'total'>> = [
  { id: 'facilities', label: 'Facilities', icon: 'fa-building' },
  { id: 'meters', label: 'Meters', icon: 'fa-database' },
  { id: 'predictors', label: 'Predictors', icon: 'fa-chart-line' },
  { id: 'energyUses', label: 'Energy Uses', icon: 'fa-screwdriver-wrench' },
  { id: 'analyses', label: 'Analyses', icon: 'fa-chart-simple' },
  { id: 'reports', label: 'Reports', icon: 'fa-file-lines' }
];

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
  @ViewChild('deleteFacilityModal') private readonly deleteFacilityModal!: TemplateRef<unknown>;

  readonly navigation = inject(WorkspaceNavigationService);
  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly search = signal('');
  readonly selectedView = signal<PortfolioContentView>('facilities');
  readonly statusFilter = signal<PortfolioStatusFilter>('all');
  readonly sortBy = signal<PortfolioSort>('facilityName');
  readonly isCreateFacilityDrawerOpen = signal(false);
  readonly facilityToDelete = signal<IdbFacility | undefined>(undefined);

  actionMessage = '';
  actionError = '';
  isDeleting = false;

  ngOnDestroy(): void {
    this.modalPortal.hide();
  }

  readonly facilitySummaries = computed<PortfolioFacilitySummary[]>(() => {
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

  readonly totals = computed<PortfolioTotals>(() => {
    const summaries = this.facilitySummaries();
    return {
      facilities: summaries.length,
      meters: summaries.reduce((sum, summary) => sum + summary.meterCount, 0),
      predictors: summaries.reduce((sum, summary) => sum + summary.predictorCount, 0),
      energyUses: summaries.reduce((sum, summary) => sum + summary.equipmentCount, 0),
      analyses: summaries.reduce((sum, summary) => sum + summary.analysisCount, 0),
      reports: summaries.reduce((sum, summary) => sum + summary.reportCount, 0)
    };
  });

  readonly portfolioSelectors = computed<PortfolioSelectorSummary[]>(() => {
    const totals = this.totals();
    return PORTFOLIO_SELECTORS.map(selector => ({
      ...selector,
      total: this.getSelectorTotal(selector.id, totals)
    }));
  });

  readonly filteredSummaries = computed<PortfolioFacilitySummary[]>(() => {
    const search = this.search().trim().toLowerCase();
    const statusFilter = this.statusFilter();
    return this.facilitySummaries()
      .filter(summary => this.matchesSearch(summary, search))
      .filter(summary => this.matchesStatusFilter(summary, statusFilter))
      .map(summary => ({
        ...summary,
        selectedContentSortValue: this.getSelectedContentSortValue(summary, this.selectedView())
      }))
      .sort((first, second) => this.compareSummaries(first, second));
  });

  readonly facilityCards = computed<PortfolioFacilityCard[]>(() => {
    const selectedView = this.selectedView();
    return this.filteredSummaries().map(summary => ({
      summary,
      content: this.buildContentSummary(summary, selectedView)
    }));
  });

  selectContentView(value: string): void {
    if (this.isPortfolioContentView(value)) {
      this.selectedView.set(value);
    }
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  setStatusFilter(value: string): void {
    if (this.isStatusFilter(value)) {
      this.statusFilter.set(value);
    }
  }

  setSortBy(value: string): void {
    if (this.isPortfolioSort(value)) {
      this.sortBy.set(value);
    }
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
  ): PortfolioFacilitySummary {
    const noMeters = meters.length === 0;
    const noReadings = meters.length > 0 && meterData.length === 0;
    const noAnalyses = analyses.length === 0;
    const issueCount = [noMeters, noReadings, noAnalyses].filter(Boolean).length;
    const latestActivity = this.getLatestActivity([facility], meters, meterData, predictors, predictorData, analyses, reports, equipment);
    const latestMeterActivity = this.getLatestActivity(meters, meterData);
    const energyAnalysisCount = analyses.filter(analysis => analysis.analysisCategory === 'energy').length;
    const waterAnalysisCount = analyses.filter(analysis => analysis.analysisCategory === 'water').length;
    const inactiveEquipmentCount = equipment.filter(item => item.noLongerInUse?.isNoLongerInUse).length;

    return {
      facility,
      location: this.formatLocation(facility),
      classification: facility.classification || 'Unclassified',
      meterCount: meters.length,
      readingCount: meterData.length,
      meterSourceSummary: this.formatTopValues(meters.map(meter => meter.source || 'Unspecified')),
      latestMeterActivityLabel: latestMeterActivity ? this.formatDate(latestMeterActivity) : 'No meter activity',
      predictorCount: predictors.length,
      predictorTypeSummary: this.formatTopValues(predictors.map(predictor => predictor.predictorType || 'Standard')),
      weatherPredictorCount: predictors.filter(predictor => predictor.predictorType === 'Weather').length,
      productionPredictorCount: predictors.filter(predictor => predictor.production || predictor.productionInAnalysis).length,
      analysisCount: analyses.length,
      energyAnalysisCount,
      waterAnalysisCount,
      checkedAnalysisCount: analyses.filter(analysis => analysis.checked).length,
      visitedAnalysisCount: analyses.filter(analysis => analysis.isAnalysisVisited).length,
      analysisBaselineSummary: this.formatTopValues(analyses.map(analysis => String(analysis.baselineYear || 'No baseline'))),
      reportCount: reports.length,
      checkedReportCount: reports.filter(report => report.checked).length,
      reportTypeSummary: this.formatTopValues(reports.map(report => this.formatReportType(report.facilityReportType))),
      equipmentCount: equipment.length,
      activeEquipmentCount: equipment.length - inactiveEquipmentCount,
      inactiveEquipmentCount,
      equipmentTypeSummary: this.formatTopValues(equipment.map(item => item.equipmentType || 'Other')),
      equipmentMeterLinkCount: equipment.reduce((sum, item) => sum + (item.utilityMeterGroupIds?.length || 0), 0),
      issueCount,
      statusTone: this.getStatusTone(noMeters, noReadings, noAnalyses),
      statusRank: this.getStatusRank(noMeters, noReadings, noAnalyses),
      latestActivityLabel: latestActivity ? this.formatDate(latestActivity) : 'No activity',
      latestActivitySortValue: latestActivity ? latestActivity.getTime() : 0,
      noMeters,
      noReadings,
      noAnalyses,
      metrics: [
        { label: 'Meters', value: String(meters.length) },
        { label: 'Predictors', value: String(predictors.length) },
        { label: 'Energy Uses', value: String(equipment.length) },
        { label: 'Analyses', value: String(analyses.length) },
        { label: 'Reports', value: String(reports.length) }
      ],
      selectedContentSortValue: 0
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
    if (this.sortBy() === 'selectedContent') {
      return second.selectedContentSortValue - first.selectedContentSortValue
        || first.facility.name.localeCompare(second.facility.name);
    }
    if (this.sortBy() === 'modified') {
      return second.latestActivitySortValue - first.latestActivitySortValue
        || first.facility.name.localeCompare(second.facility.name);
    }
    return first.facility.name.localeCompare(second.facility.name);
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

  private buildContentSummary(summary: PortfolioFacilitySummary, selectedView: PortfolioContentView): PortfolioContentSummary {
    switch (selectedView) {
      case 'meters':
        return {
          metrics: [
            { label: 'Meters', value: String(summary.meterCount) },
            { label: 'Readings', value: String(summary.readingCount) }
          ],
          details: [
            { icon: 'fa-bolt', label: summary.meterSourceSummary },
            { icon: 'fa-calendar-days', label: `Latest meter activity ${summary.latestMeterActivityLabel}` }
          ],
          emptyMessage: summary.meterCount === 0 ? 'Add meters to begin utility data tracking for this facility.' : undefined
        };
      case 'predictors':
        return {
          metrics: [
            { label: 'Predictors', value: String(summary.predictorCount) },
            { label: 'Weather', value: String(summary.weatherPredictorCount) },
            { label: 'Production', value: String(summary.productionPredictorCount) }
          ],
          details: [{ icon: 'fa-tags', label: summary.predictorTypeSummary }],
          emptyMessage: summary.predictorCount === 0 ? 'Add predictors when this facility needs normalization variables.' : undefined
        };
      case 'energyUses':
        return {
          metrics: [
            { label: 'Energy Uses', value: String(summary.equipmentCount) },
            { label: 'Active', value: String(summary.activeEquipmentCount) },
            { label: 'Inactive', value: String(summary.inactiveEquipmentCount) },
            { label: 'Meter Links', value: String(summary.equipmentMeterLinkCount) }
          ],
          details: [{ icon: 'fa-tags', label: summary.equipmentTypeSummary }],
          emptyMessage: summary.equipmentCount === 0 ? 'Add energy uses to describe equipment and end-use activity.' : undefined
        };
      case 'analyses':
        return {
          metrics: [
            { label: 'Analyses', value: String(summary.analysisCount) },
            { label: 'Energy', value: String(summary.energyAnalysisCount) },
            { label: 'Water', value: String(summary.waterAnalysisCount) },
            { label: 'Checked', value: String(summary.checkedAnalysisCount) },
            { label: 'Visited', value: String(summary.visitedAnalysisCount) }
          ],
          details: [{ icon: 'fa-calendar-check', label: `Baselines ${summary.analysisBaselineSummary}` }],
          emptyMessage: summary.analysisCount === 0 ? 'Create analyses once utility data and predictors are ready.' : undefined
        };
      case 'reports':
        return {
          metrics: [
            { label: 'Reports', value: String(summary.reportCount) },
            { label: 'Checked', value: String(summary.checkedReportCount) }
          ],
          details: [{ icon: 'fa-tags', label: summary.reportTypeSummary }],
          emptyMessage: summary.reportCount === 0 ? 'Build reports after facility data and analyses are available.' : undefined
        };
      default:
        return {
          metrics: summary.metrics,
          details: []
        };
    }
  }

  private getSelectorTotal(selectorId: PortfolioContentView, totals: PortfolioTotals): number {
    switch (selectorId) {
      case 'meters':
        return totals.meters;
      case 'predictors':
        return totals.predictors;
      case 'energyUses':
        return totals.energyUses;
      case 'analyses':
        return totals.analyses;
      case 'reports':
        return totals.reports;
      default:
        return totals.facilities;
    }
  }

  private getSelectedContentSortValue(summary: PortfolioFacilitySummary, selectedView: PortfolioContentView): number {
    switch (selectedView) {
      case 'meters':
        return summary.meterCount;
      case 'predictors':
        return summary.predictorCount;
      case 'energyUses':
        return summary.equipmentCount;
      case 'analyses':
        return summary.analysisCount;
      case 'reports':
        return summary.reportCount;
      default:
        return summary.meterCount + summary.readingCount + summary.predictorCount + summary.equipmentCount + summary.analysisCount + summary.reportCount;
    }
  }

  private formatTopValues(values: readonly string[]): string {
    const normalizedValues = values
      .map(value => value?.trim())
      .filter((value): value is string => !!value);
    if (normalizedValues.length === 0) {
      return 'None yet';
    }
    const counts = normalizedValues.reduce((map, value) => {
      map.set(value, (map.get(value) || 0) + 1);
      return map;
    }, new Map<string, number>());
    const sortedValues = Array.from(counts.entries())
      .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
      .map(([value]) => value);
    const visibleValues = sortedValues.slice(0, 2).join(', ');
    const remainingCount = sortedValues.length - 2;
    return remainingCount > 0 ? `${visibleValues} +${remainingCount} more` : visibleValues;
  }

  private formatReportType(reportType: string | undefined): string {
    switch (reportType) {
      case 'emissionFactors':
        return 'Emission Factors';
      case 'costSavings':
        return 'Cost Savings';
      case 'dataQuality':
        return 'Data Quality';
      case 'overview':
        return 'Overview';
      case 'analysis':
        return 'Analysis';
      case 'savings':
        return 'Savings';
      case 'modeling':
        return 'Modeling';
      default:
        return 'Other';
    }
  }

  private isPortfolioContentView(value: string): value is PortfolioContentView {
    return PORTFOLIO_SELECTORS.some(selector => selector.id === value);
  }

  private isStatusFilter(value: string): value is PortfolioStatusFilter {
    return ['all', 'attention', 'noMeters', 'noReadings', 'noAnalyses'].includes(value);
  }

  private isPortfolioSort(value: string): value is PortfolioSort {
    return ['facilityName', 'modified', 'selectedContent'].includes(value);
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
