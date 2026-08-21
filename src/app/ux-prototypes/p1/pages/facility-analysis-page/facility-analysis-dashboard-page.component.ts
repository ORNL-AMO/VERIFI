import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { getGUID } from 'src/app/shared/sharedHelperFunctions';
import { AnalysisCategory } from '@data/models/analysis';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import {
  P1FacilityAnalysisRow,
  buildP1FacilityAnalysisRows
} from './facility-analysis-workbench.helpers';

type P1AnalysisCategoryFilter = 'all' | 'energy' | 'water';
type P1AnalysisStatusFilter = 'all' | 'good' | 'warning' | 'error' | 'reporting' | 'issues';

@Component({
  selector: 'app-p1-facility-analysis-dashboard-page',
  templateUrl: './facility-analysis-dashboard-page.component.html',
  styleUrls: ['./facility-analysis-page.component.css'],
  standalone: false
})
export class P1FacilityAnalysisDashboardPageComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly statusCheckService = inject(AccountStatusCheckService);
  private readonly toast = inject(ToastNotificationsService);
  private readonly router = inject(Router);

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly analyses = computed(() => [...this.workspace.selectedFacilityAnalyses()]);
  readonly meterGroups = computed(() => [...this.workspace.meterGroups()]);
  readonly predictors = computed(() => [...this.workspace.predictors()]);
  readonly accountAnalyses = computed(() => [...this.workspace.accountAnalyses()]);
  readonly reports = computed(() => [...this.workspace.selectedFacilityReports()]);
  readonly facilityStatusCheck = toSignal(this.statusCheckService.selectedFacilityStatusCheck$);
  readonly analysisRows = computed(() => buildP1FacilityAnalysisRows(
    this.analyses(),
    this.facilityStatusCheck()?.analysisStatusChecks ?? [],
    this.accountAnalyses(),
    this.reports(),
    this.facility()
  ));
  readonly issueCount = computed(() => this.analysisRows().filter(row => row.tone === 'danger' || row.tone === 'warning').length);
  readonly activeEnergy = computed(() => this.analysisRows().find(row => row.analysis.guid === this.facility()?.selectedEnergyAnalysisId));
  readonly activeWater = computed(() => this.analysisRows().find(row => row.analysis.guid === this.facility()?.selectedWaterAnalysisId));
  readonly analysisSearch = signal('');
  readonly categoryFilter = signal<P1AnalysisCategoryFilter>('all');
  readonly statusFilter = signal<P1AnalysisStatusFilter>('all');
  readonly filteredAnalysisRows = computed(() => this.analysisRows().filter(row => this.matchesDashboardFilters(row)));
  readonly hasDashboardFilters = computed(() =>
    this.analysisSearch().trim().length > 0 || this.categoryFilter() !== 'all' || this.statusFilter() !== 'all'
  );

  readonly showCreate = signal(false);
  readonly newAnalysisCategory = signal<AnalysisCategory>('energy');
  readonly detailsRow = signal<P1FacilityAnalysisRow | undefined>(undefined);
  readonly rowToDelete = signal<P1FacilityAnalysisRow | undefined>(undefined);
  readonly compareRows = signal<P1FacilityAnalysisRow[]>([]);
  readonly isCompareDrawerOpen = signal(false);
  readonly compareGuids = computed(() => this.compareRows().map(row => row.analysis.guid));

  openCreate(category: AnalysisCategory = 'energy'): void {
    this.newAnalysisCategory.set(category);
    this.showCreate.set(true);
  }

  async createAnalysis(): Promise<void> {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility || !this.canWrite()) {
      return;
    }
    const item = getNewIdbAnalysisItem(
      account,
      facility,
      this.meterGroups(),
      this.predictors(),
      this.newAnalysisCategory()
    );
    const result = await this.commandBoundary.execute(
      {
        entityKind: 'facilityAnalysis',
        changeKind: 'add',
        label: 'Create Facility Analysis',
        publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('facilityAnalyses', [value]) }
      },
      () => this.analysisHandler.addFacilityAnalysis(item, account.guid)
    );
    this.showCreate.set(false);
    this.toast.showToast('Analysis Created', undefined, undefined, false, 'alert-success');
    this.openAnalysis(result.value);
  }

  openAnalysis(analysis: IdbAnalysisItem): void {
    this.workspaceService.selectFacilityAnalysis(analysis.guid);
    const facility = this.facility();
    if (!facility) {
      return;
    }
    void this.router.navigate(['/p1', 'workspace', 'facility', facility.guid, 'analysis', 'workbench', 'help'], {
      queryParams: { analysis: analysis.guid, step: 'setup' }
    });
  }

  viewDetails(analysis: IdbAnalysisItem): void {
    this.isCompareDrawerOpen.set(false);
    this.detailsRow.set(this.analysisRows().find(row => row.analysis.guid === analysis.guid));
  }

  toggleCompare(analysis: IdbAnalysisItem): void {
    this.detailsRow.set(undefined);
    const updatedRows = this.updateCompareRows(this.compareRows(), analysis);
    this.compareRows.set(updatedRows);
    this.isCompareDrawerOpen.set(updatedRows.length > 0);
  }

  closeComparison(): void {
    this.clearComparison();
  }

  clearComparison(): void {
    this.compareRows.set([]);
    this.isCompareDrawerOpen.set(false);
  }

  resetDashboardFilters(): void {
    this.analysisSearch.set('');
    this.categoryFilter.set('all');
    this.statusFilter.set('all');
  }

  private matchesDashboardFilters(row: P1FacilityAnalysisRow): boolean {
    const search = this.analysisSearch().trim().toLocaleLowerCase();
    const category = this.categoryFilter();
    const status = this.statusFilter();
    if (category !== 'all' && row.analysis.analysisCategory !== category) {
      return false;
    }
    if (!this.matchesStatusFilter(row, status)) {
      return false;
    }
    if (!search) {
      return true;
    }
    const searchable = [
      row.analysis.name,
      row.analysis.analysisCategory,
      row.status?.status || 'unknown',
      row.analysis.baselineYear?.toString() || '',
      row.isActiveForReporting ? 'reporting active' : ''
    ].join(' ').toLocaleLowerCase();
    return searchable.includes(search);
  }

  private matchesStatusFilter(row: P1FacilityAnalysisRow, status: P1AnalysisStatusFilter): boolean {
    switch (status) {
      case 'good':
      case 'warning':
      case 'error':
        return row.status?.status === status;
      case 'reporting':
        return row.isActiveForReporting;
      case 'issues':
        return row.tone === 'danger' || row.tone === 'warning';
      default:
        return true;
    }
  }

  private updateCompareRows(rows: P1FacilityAnalysisRow[], analysis: IdbAnalysisItem): P1FacilityAnalysisRow[] {
    const existing = rows.find(row => row.analysis.guid === analysis.guid);
    if (existing) {
      return rows.filter(row => row.analysis.guid !== analysis.guid);
    }
    const row = this.analysisRows().find(item => item.analysis.guid === analysis.guid);
    return row ? [...rows, row].slice(-2) : rows;
  }

  async copyAnalysis(analysis: IdbAnalysisItem): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite()) {
      return;
    }
    const copy = structuredClone(analysis);
    delete copy.id;
    copy.guid = getGUID();
    copy.name = `${copy.name} (copy)`;
    const result = await this.commandBoundary.execute(
      {
        entityKind: 'facilityAnalysis',
        changeKind: 'add',
        label: 'Copy Facility Analysis',
        publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('facilityAnalyses', [value]) }
      },
      () => this.analysisHandler.addFacilityAnalysis(copy, account.guid)
    );
    this.toast.showToast('Analysis Copied', undefined, undefined, false, 'alert-success');
    this.openAnalysis(result.value);
  }

  async setActiveAnalysis(analysis: IdbAnalysisItem): Promise<void> {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility || !this.canWrite()) {
      return;
    }
    const updatedFacility: IdbFacility = analysis.analysisCategory === 'water'
      ? { ...facility, selectedWaterAnalysisId: analysis.guid }
      : { ...facility, selectedEnergyAnalysisId: analysis.guid };
    await this.commandBoundary.execute(
      {
        entityKind: 'facility',
        changeKind: 'update',
        entityGuid: updatedFacility.guid,
        label: 'Set Active Analysis',
        publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('facilities', [value]) }
      },
      () => this.facilityHandler.update(updatedFacility, account.guid)
    );
    this.toast.showToast('Active Analysis Updated', undefined, undefined, false, 'alert-success');
  }

  requestDelete(row: P1FacilityAnalysisRow): void {
    this.rowToDelete.set(row);
  }

  async deleteAnalysis(): Promise<void> {
    const row = this.rowToDelete();
    const account = this.account();
    const facility = this.facility();
    if (!row || !account || !facility || !this.canWrite()) {
      return;
    }
    await this.commandBoundary.execute(
      {
        entityKind: 'facilityAnalysis',
        changeKind: 'delete',
        entityGuid: row.analysis.guid,
        label: 'Delete Facility Analysis'
      },
      async () => {
        await this.analysisHandler.deleteFacilityAnalysis(row.analysis, account.guid);
        await this.clearDeletedAnalysisReferences(row.analysis, account, facility);
        return row.analysis;
      }
    );
    this.rowToDelete.set(undefined);
    this.detailsRow.set(undefined);
    this.compareRows.update(rows => rows.filter(item => item.analysis.guid !== row.analysis.guid));
    this.toast.showToast('Analysis Deleted', undefined, undefined, false, 'alert-success');
  }

  private async clearDeletedAnalysisReferences(
    analysis: IdbAnalysisItem,
    account: IdbAccount,
    facility: IdbFacility
  ): Promise<void> {
    const accountAnalyses: IdbAccountAnalysisItem[] = this.accountAnalyses();
    for (const item of accountAnalyses) {
      let changed = false;
      const updated: IdbAccountAnalysisItem = {
        ...item,
        facilityAnalysisItems: item.facilityAnalysisItems.map(link => {
          if (link.facilityId === facility.guid && link.analysisItemId === analysis.guid) {
            changed = true;
            return { ...link, analysisItemId: undefined };
          }
          return { ...link };
        })
      };
      if (changed) {
        await this.analysisHandler.updateAccountAnalysis(updated, account.guid);
      }
    }
    const facilityUpdate: IdbFacility = { ...facility };
    if (facilityUpdate.selectedEnergyAnalysisId === analysis.guid) {
      facilityUpdate.selectedEnergyAnalysisId = undefined;
    }
    if (facilityUpdate.selectedWaterAnalysisId === analysis.guid) {
      facilityUpdate.selectedWaterAnalysisId = undefined;
    }
    if (facilityUpdate.selectedEnergyAnalysisId !== facility.selectedEnergyAnalysisId || facilityUpdate.selectedWaterAnalysisId !== facility.selectedWaterAnalysisId) {
      await this.facilityHandler.update(facilityUpdate, account.guid);
    }
  }
}
