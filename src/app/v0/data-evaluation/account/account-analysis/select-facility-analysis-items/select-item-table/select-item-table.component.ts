import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, computed, DestroyRef, HostListener, inject, signal, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnalysisStatusCheck } from '@domain/calculations/status-check-calculations/analysisStatusCheck';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from '@domain/calculations/status-check-calculations/accountStatusCheck';
import { AccountAnalysisStatusCheck } from '@domain/calculations/status-check-calculations/accountAnalysisStatusCheck';

interface PendingAssignment {
  accountGuid: string;
  analysisGuid: string;
  facilityId: string;
  analysisItemId: string;
  version: number;
}

interface FacilityAnalysisListItem {
  analysisItem: IdbAnalysisItem;
  statusCheck: AnalysisStatusCheck | undefined;
}

@Component({
  selector: 'app-select-item-table',
  templateUrl: './select-item-table.component.html',
  styleUrls: ['./select-item-table.component.css'],
  standalone: false
})
export class SelectItemTableComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routerGuardService = inject(RouterGuardService);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private router: Router = inject(Router);
  private loadingService: LoadingService = inject(LoadingService);
  private analysisService: AnalysisService = inject(AnalysisService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  selectedAnalysisItem: Signal<IdbAccountAnalysisItem> = this.accountWorkspaceStore.selectedAccountAnalysis;
  allFacilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => [...this.accountWorkspaceStore.facilityAnalyses()]);
  selectedFacility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);

  accountAnalysisStatusCheck: Signal<AccountAnalysisStatusCheck> = computed(() => {
    const selectedItem = this.selectedAnalysisItem();
    const accountStatusCheck = this.accountStatusCheck();
    if (selectedItem && accountStatusCheck) {
      return accountStatusCheck.getAccountAnalysisStatusCheckById(selectedItem.guid);
    }
    return null;
  });

  facilityAnalysisListItems: Signal<Array<FacilityAnalysisListItem>> = computed(() => {
    const allItems = this.allFacilityAnalysisItems();
    const selectedItem = this.selectedAnalysisItem();
    const selectedFacility = this.selectedFacility();
    const accountStatusCheck = this.accountStatusCheck();
    let filteredItems: Array<FacilityAnalysisListItem> = [];
    if (allItems && selectedItem && selectedFacility) {
      const facilityStatusCheck = accountStatusCheck?.getFacilityStatusCheckByFacilityId(selectedFacility.guid);
      let filteredAnalysisItems: Array<IdbAnalysisItem> = [];
      if (selectedItem.analysisCategory == 'energy') {
        filteredAnalysisItems = allItems.filter(item => {
          return (item.analysisCategory == selectedItem.analysisCategory
            && item.facilityId == selectedFacility.guid
            && item.energyIsSource == selectedItem.energyIsSource
            && (item.baselineYear == selectedItem.baselineYear || selectedFacility.isNewFacility));
        });
      } else if (selectedItem.analysisCategory == 'water') {
        filteredAnalysisItems = allItems.filter(item => {
          return (item.analysisCategory == selectedItem.analysisCategory
            && item.facilityId == selectedFacility.guid
            && (item.baselineYear == selectedItem.baselineYear || selectedFacility.isNewFacility));
        });
      }
      //order by modified date
      filteredAnalysisItems = filteredAnalysisItems.sort((a, b) => {
        return new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime();
      });
      filteredItems = filteredAnalysisItems.map(item => {
        return {
          analysisItem: item,
          statusCheck: facilityStatusCheck ? facilityStatusCheck.getAnalysisStatusById(item.guid) : null
        }
      });
    }
    return filteredItems;
  });

  selectedFacilityItemId: Signal<string> = computed(() => {
    const selectedItem = this.selectedAnalysisItem();
    const facility = this.selectedFacility();
    if (selectedItem && facility) {
      const pending = this.pendingAssignments().get(`${selectedItem.guid}:${facility.guid}`);
      if (pending) return pending.analysisItemId;
      const facilityItem = selectedItem.facilityAnalysisItems.find(item => item.facilityId == facility.guid);
      const itemId = facilityItem ? facilityItem.analysisItemId : null;
      return itemId;
    }
    return null;
  });

  selectedFacilityItem: Signal<IdbAnalysisItem> = computed(() => {
    const facilityItemId = this.selectedFacilityItemId();
    const allItems = this.allFacilityAnalysisItems();
    return allItems.find(item => item.guid == facilityItemId);
  });

  itemToEdit: IdbAnalysisItem;
  showCreateItem: boolean;

  readonly saving = signal(false);
  readonly saveError = signal<string | undefined>(undefined);
  private readonly pendingAssignments = signal<ReadonlyMap<string, PendingAssignment>>(new Map());
  private editVersion = 0;
  private runningSave?: Promise<void>;
  private leaveDecision?: Promise<boolean>;
  private lastSaveFailure?: unknown;
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.destroyed = true);
  }

  selectAnalysis(analysisItemId: string): void {
    void this.save(analysisItemId).catch(() => undefined);
  }

  async save(analysisItemId: string): Promise<void> {
    const analysisGuid = this.selectedAnalysisItem()?.guid;
    const facilityId = this.selectedFacility()?.guid;
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    const pending = new Map(this.pendingAssignments());
    pending.set(`${analysisGuid}:${facilityId}`, { analysisGuid, facilityId, accountGuid, analysisItemId, version: ++this.editVersion });
    this.pendingAssignments.set(pending);
    await this.drainSaves();
    if (this.lastSaveFailure) throw this.lastSaveFailure;
  }

  async flushChanges(): Promise<boolean> {
    const context = this.editingContext();
    if (!this.isCurrentContext(context)) return false;
    await this.drainSaves();
    return this.isCurrentContext(context) && this.pendingAssignments().size === 0;
  }

  retrySave(): void {
    void this.flushChanges();
  }

  canDeactivate(): Promise<boolean> {
    if (!this.leaveDecision) {
      this.leaveDecision = this.finishEditing().finally(() => this.leaveDecision = undefined);
    }
    return this.leaveDecision;
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.pendingAssignments().size || this.runningSave) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  private drainSaves(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    if (this.runningSave) return this.runningSave;
    this.runningSave = this.persistAssignments().finally(() => {
      this.runningSave = undefined;
      if (!this.destroyed) this.saving.set(false);
    });
    return this.runningSave;
  }

  private async persistAssignments(): Promise<void> {
    while (!this.destroyed && this.pendingAssignments().size) {
      const owner = this.pendingAssignments().values().next().value as PendingAssignment;
      const assignments = [...this.pendingAssignments().values()].filter(item =>
        item.accountGuid === owner.accountGuid && item.analysisGuid === owner.analysisGuid
      );
      this.saving.set(true);
      this.lastSaveFailure = undefined;
      this.saveError.set(undefined);
      try {
        await this.commandBoundary.execute(
          { entityKind: 'accountAnalysis', changeKind: 'update', entityGuid: owner.analysisGuid, label: 'Update Analysis Selection',
            publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountAnalyses', upsert: [value] }] }) } },
          () => this.analysisHandler.updateAccountFacilityAssignments(
            owner.analysisGuid,
            assignments.map(({ facilityId, analysisItemId }) => ({ facilityId, analysisItemId })),
            owner.accountGuid
          )
        );
      } catch (error) {
        if (this.destroyed || this.accountWorkspaceStore.account()?.guid !== owner.accountGuid || this.selectedAnalysisItem()?.guid !== owner.analysisGuid) {
          const pending = new Map(this.pendingAssignments());
          for (const assignment of assignments) {
            const key = `${assignment.analysisGuid}:${assignment.facilityId}`;
            if (pending.get(key)?.version === assignment.version) pending.delete(key);
          }
          this.pendingAssignments.set(pending);
          continue;
        }
        this.lastSaveFailure = error;
        this.saveError.set('Your analysis selection could not be saved. Retry, or keep this page open.');
        return;
      }
      if (this.destroyed) return;
      const pending = new Map(this.pendingAssignments());
      for (const assignment of assignments) {
        const key = `${assignment.analysisGuid}:${assignment.facilityId}`;
        if (pending.get(key)?.version === assignment.version) pending.delete(key);
      }
      this.pendingAssignments.set(pending);
    }
  }

  private editingContext() {
    return { accountGuid: this.accountWorkspaceStore.account()?.guid, analysisGuid: this.selectedAnalysisItem()?.guid,
      facilityGuid: this.selectedFacility()?.guid };
  }

  private isCurrentContext(context: ReturnType<SelectItemTableComponent['editingContext']>): boolean {
    return !this.destroyed && this.accountWorkspaceStore.account()?.guid === context.accountGuid &&
      this.selectedAnalysisItem()?.guid === context.analysisGuid && this.selectedFacility()?.guid === context.facilityGuid;
  }

  private async finishEditing(): Promise<boolean> {
    const context = this.editingContext();
    if (!this.lastSaveFailure && await this.flushChanges()) return this.isCurrentContext(context);
    if (!this.isCurrentContext(context)) return false;
    const version = this.editVersion;
    const actionPromise = firstValueFrom(this.routerGuardService.getModalAction().pipe(take(1)));
    this.routerGuardService.setShowSave(true);
    this.routerGuardService.setShowModal(true);
    const action = await actionPromise;
    if (!this.isCurrentContext(context) || this.editVersion !== version) return false;
    if (action === 'discard') {
      this.pendingAssignments.set(new Map());
      this.lastSaveFailure = undefined;
      this.saveError.set(undefined);
      return true;
    }
    if (action === 'save') return await this.flushChanges() && this.isCurrentContext(context);
    return false;
  }


  editItem(analysisItem: IdbAnalysisItem) {
    this.sharedDataService.modalOpen.next(true);
    this.itemToEdit = analysisItem;
  }

  cancelEditItem() {
    this.sharedDataService.modalOpen.next(false);
    this.itemToEdit = undefined;
  }

  async confirmEditItem(): Promise<void> {
    const analysisGuid = this.selectedAnalysisItem()?.guid;
    const facilityGuid = this.selectedFacility()?.guid;
    if (!await this.canDeactivate() || this.destroyed || this.selectedAnalysisItem()?.guid !== analysisGuid ||
      this.selectedFacility()?.guid !== facilityGuid) return;
    this.sharedDataService.modalOpen.next(false);
    const facility = this.selectedFacility();
    const selectedAnalysisItem = this.selectedAnalysisItem();
    this.analysisService.accountAnalysisItem.next(selectedAnalysisItem);
    this.accountWorkspaceService.selectFacilityAnalysis((this.itemToEdit)?.guid);
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/analysis/run-analysis');
  }

  createNewItem() {
    this.sharedDataService.modalOpen.next(true);
    this.showCreateItem = true;
  }

  cancelCreateNew() {
    this.sharedDataService.modalOpen.next(false);
    this.showCreateItem = false;
  }

  async confirmCreateNew() {
    const ownerGuid = this.selectedAnalysisItem()?.guid;
    const ownerFacilityGuid = this.selectedFacility()?.guid;
    if (!await this.canDeactivate() || this.destroyed) return;
    if (!this.selectedAnalysisItem() || !this.selectedFacility()) {
      throw new WorkspaceWriteError('validation-failed', 'The account analysis or facility is no longer available.');
    }
    if (this.selectedAnalysisItem().guid !== ownerGuid || this.selectedFacility().guid !== ownerFacilityGuid) return;
    const facility = this.selectedFacility();
    const selectedAnalysisItem = this.selectedAnalysisItem();
    const analysisGuid = selectedAnalysisItem.guid;
    const facilityGuid = facility.guid;

    this.sharedDataService.modalOpen.next(false);
    this.loadingService.setLoadingMessage('Creating Facility Analysis...')
    this.loadingService.setLoadingStatus(true);
    this.showCreateItem = false;
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = [...this.accountWorkspaceStore.meterGroups()];
    let accountPredictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.predictors()];
    let newIdbItem: IdbAnalysisItem = getNewIdbAnalysisItem(account, facility, accountMeterGroups, accountPredictors, selectedAnalysisItem.analysisCategory);
    newIdbItem.energyIsSource = selectedAnalysisItem.energyIsSource;
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    const { value } = await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'bulk', label: 'Create Facility Analysis' },
      async () => {
        const currentAnalysis = this.accountWorkspaceStore.accountAnalyses().find(item =>
          item.guid === analysisGuid && item.accountId === activeAccountGuid
        );
        const currentFacility = this.accountWorkspaceStore.facilities().find(item =>
          item.guid === facilityGuid && item.accountId === activeAccountGuid
        );
        if (!currentAnalysis || !currentFacility ||
          !currentAnalysis.facilityAnalysisItems.some(item => item.facilityId === facilityGuid)) {
          throw new WorkspaceWriteError('validation-failed', 'The account analysis or facility is no longer available.');
        }
        const added = await this.analysisHandler.addFacilityAnalysis(newIdbItem, activeAccountGuid);
        const updatedAccountAnalysisItem = await this.analysisHandler.updateAccountFacilityAssignments(
          analysisGuid,
          [{ facilityId: facilityGuid, analysisItemId: added.guid }],
          activeAccountGuid
        );
        return { addedItem: added, updatedAccountAnalysisItem };
      }
    );
    this.loadingService.setLoadingStatus(false);
    if (this.destroyed || this.accountWorkspaceStore.account()?.guid !== activeAccountGuid ||
      this.selectedAnalysisItem()?.guid !== analysisGuid || this.selectedFacility()?.guid !== facilityGuid) return;
    this.accountWorkspaceService.selectFacilityAnalysis(value.addedItem?.guid);
    this.analysisService.accountAnalysisItem.next(value.updatedAccountAnalysisItem);
    this.router.navigateByUrl("/data-evaluation/facility/" + facility.guid + "/analysis/run-analysis/analysis-setup");
  }
}
