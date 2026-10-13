import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { getNewIdbAnalysisItem, IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { buildFacilityAnalysisCards } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis.models';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';
import {
  buildFacilityAnalysisCandidate,
  buildFacilitySelectionItems,
  eligibleFacilityAnalysisCandidates,
  facilityAnalysisBaselineForAccount,
  reconcileFacilityAnalysisLinks
} from './account-analysis-facility-selection.models';

export const ACCOUNT_ANALYSIS_ORIGIN_QUERY = {
  accountGuid: 'returnAccountGuid',
  analysisGuid: 'returnAccountAnalysisGuid',
  facilityGuid: 'returnFacilityGuid'
} as const;

@Injectable()
export class AccountAnalysisFacilitySelectionService {
  private readonly context = inject(AccountAnalysisWorkbenchContext);
  private readonly autosave = inject(AccountAnalysisAutosaveService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly requestedFacility = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap
  });
  private readonly activeFacilityGuidValue = signal('');
  private readonly busyValue = signal(false);
  private readonly errorValue = signal<string | undefined>(undefined);
  private lastRequestedFacilityGuid = '';

  readonly activeFacilityGuid = this.activeFacilityGuidValue.asReadonly();
  readonly busy = this.busyValue.asReadonly();
  readonly error = this.errorValue.asReadonly();
  readonly analysis = computed(() => this.autosave.draft() || this.context.analysis());
  readonly canMutate = computed(() => this.context.workspace.canWrite()
    && !this.context.workspace.hasPending()
    && !this.busyValue()
    && this.autosave.state() !== 'saving');
  readonly allFindings = this.context.status.items;
  readonly selectionItems = computed(() => {
    const analysis = this.analysis();
    return analysis ? buildFacilitySelectionItems(
      analysis,
      this.context.facilities(),
      this.context.facilityAnalyses(),
      this.allFindings(),
      this.context.status.state()
    ) : [];
  });
  readonly activeIndex = computed(() => this.selectionItems().findIndex(item =>
    item.facility.guid === this.activeFacilityGuidValue()
  ));
  readonly activeItem = computed(() => this.selectionItems()[this.activeIndex()]);
  readonly activeFacility = computed(() => this.activeItem()?.facility);
  readonly candidates = computed(() => {
    const analysis = this.analysis();
    const facility = this.activeFacility();
    if (!analysis || !facility) return [];
    return eligibleFacilityAnalysisCandidates(
      this.context.facilityAnalyses(),
      analysis,
      facility,
      this.allFindings(),
      this.context.status.state(),
      this.dataInputs()
    );
  });
  readonly selectedCandidate = computed(() => {
    const item = this.activeItem();
    if (!item?.selectedAnalysis) return undefined;
    return this.candidates().find(candidate => candidate.analysis.guid === item.selectedAnalysis!.guid)
      ?? buildFacilityAnalysisCandidate(
        item.selectedAnalysis,
        this.allFindings(),
        this.context.status.state(),
        this.dataInputs()
      );
  });
  readonly detailCards = computed(() => {
    const facility = this.activeFacility();
    if (!facility) return [];
    const draft = this.analysis();
    const accountAnalyses = draft
      ? [...this.context.workspace.accountAnalyses().filter(item => item.guid !== draft.guid), draft]
      : this.context.workspace.accountAnalyses();
    return buildFacilityAnalysisCards({
      analyses: this.context.facilityAnalyses().filter(item => item.facilityId === facility.guid),
      accountAnalyses,
      reports: this.context.workspace.facilityReports().filter(item => item.facilityId === facility.guid),
      meterGroups: this.context.workspace.meterGroups(),
      facility,
      statusItems: this.allFindings(),
      statusState: this.context.status.state()
    });
  });
  readonly assignedCount = computed(() => this.selectionItems().filter(item => item.assigned).length);
  readonly validCount = computed(() => this.selectionItems()
    .filter(item => item.assigned && item.state !== 'error').length);
  readonly allAssigned = computed(() => this.selectionItems().length > 0
    && this.selectionItems().every(item => item.assigned));
  readonly currentAssigned = computed(() => !!this.activeItem()?.assigned);
  readonly hasSelectedErrors = computed(() => this.selectionItems().some(item => item.state === 'error'));
  readonly resultsReady = computed(() => this.context.status.state() === 'ready'
    && this.allAssigned()
    && !this.hasSelectedErrors());
  readonly isFirst = computed(() => this.activeIndex() <= 0);
  readonly isLast = computed(() => this.activeIndex() >= 0
    && this.activeIndex() === this.selectionItems().length - 1);

  private readonly dataInputs = computed(() => ({
    meterGroups: this.context.workspace.meterGroups(),
    meters: this.context.workspace.meters(),
    meterData: this.context.workspace.meterData(),
    predictorData: this.context.workspace.predictorData()
  }));

  constructor() {
    effect(() => {
      const items = this.selectionItems();
      const requestedGuid = this.requestedFacility().get('facilityGuid') ?? '';
      const requestedChanged = requestedGuid && requestedGuid !== this.lastRequestedFacilityGuid;
      if (requestedChanged && items.some(item => item.facility.guid === requestedGuid)) {
        this.lastRequestedFacilityGuid = requestedGuid;
        this.activeFacilityGuidValue.set(requestedGuid);
        return;
      }
      const currentGuid = this.activeFacilityGuidValue();
      if (items.some(item => item.facility.guid === currentGuid)) return;
      const selectedGuid = this.context.workspace.selectedFacility()?.guid;
      const fallback = items.find(item => item.facility.guid === selectedGuid) ?? items[0];
      this.activeFacilityGuidValue.set(fallback?.facility.guid ?? '');
    });
  }

  selectFacility(facilityGuid: string): void {
    if (this.selectionItems().some(item => item.facility.guid === facilityGuid)) {
      this.activeFacilityGuidValue.set(facilityGuid);
    }
  }

  focusPrevious(): boolean {
    const previous = this.selectionItems()[this.activeIndex() - 1];
    if (!previous) return false;
    this.activeFacilityGuidValue.set(previous.facility.guid);
    return true;
  }

  focusNext(): boolean {
    const next = this.selectionItems()[this.activeIndex() + 1];
    if (!next) return false;
    this.activeFacilityGuidValue.set(next.facility.guid);
    return true;
  }

  selectAnalysis(analysisItemId: string): void {
    const facility = this.activeFacility();
    const candidate = this.candidates().find(item => item.analysis.guid === analysisItemId);
    if (!facility || !candidate || !this.canMutate()) return;
    this.updateSelection(facility.guid, analysisItemId);
  }

  skipFacility(): void {
    const facility = this.activeFacility();
    if (!facility || !this.canMutate()) return;
    this.updateSelection(facility.guid, 'skip');
  }

  clearError(): void {
    this.errorValue.set(undefined);
  }

  async openFacilityAnalysis(analysis: IdbAnalysisItem): Promise<boolean> {
    if (!await this.autosave.flush()) return false;
    const account = this.context.account();
    const accountAnalysis = this.analysis();
    if (!account || !accountAnalysis || analysis.accountId !== account.guid) return false;
    await this.router.navigate(
      this.navigation.facilityAnalysisWorkbenchRoute(analysis.facilityId, analysis.guid),
      { queryParams: this.returnOriginQueryParams(account.guid, accountAnalysis.guid, analysis.facilityId) }
    );
    return true;
  }

  async createFacilityAnalysis(): Promise<boolean> {
    if (this.busyValue() || !this.canMutate() || !await this.autosave.flush()) return false;
    const account = this.context.account();
    const accountAnalysis = this.autosave.draft();
    const facility = this.activeFacility();
    if (!account || !accountAnalysis || !facility) return false;

    const analysis = getNewIdbAnalysisItem(
      account,
      facility,
      [...this.context.workspace.meterGroups()],
      [...this.context.workspace.predictors()],
      accountAnalysis.analysisCategory
    );
    analysis.energyIsSource = accountAnalysis.energyIsSource;
    analysis.baselineYear = facilityAnalysisBaselineForAccount(accountAnalysis, facility);

    this.busyValue.set(true);
    this.errorValue.set(undefined);
    try {
      const result = await this.commandBoundary.execute({
        entityKind: 'facilityAnalysis',
        changeKind: 'bulk',
        entityGuid: analysis.guid,
        label: 'Creating and linking facility analysis',
        notification: { successTitle: 'Facility analysis created', successMessage: analysis.name },
        publication: {
          mode: 'patch',
          buildPatch: value => ({
            collections: [
              { collection: 'facilityAnalyses', upsert: [value.analysis] },
              { collection: 'accountAnalyses', upsert: [value.accountAnalysis] }
            ]
          })
        }
      }, () => this.analysisHandler.createLinkedFacilityAnalysisForAccount({
        accountGuid: account.guid,
        accountAnalysisGuid: accountAnalysis.guid,
        facilityGuid: facility.guid,
        analysis
      }));
      await this.router.navigate(
        this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, result.value.analysis.guid),
        { queryParams: this.returnOriginQueryParams(account.guid, accountAnalysis.guid, facility.guid) }
      );
      return true;
    } catch (error) {
      this.errorValue.set(errorMessage(error, 'The facility analysis could not be created.'));
      return false;
    } finally {
      this.busyValue.set(false);
    }
  }

  private updateSelection(facilityGuid: string, analysisItemId: string): void {
    this.errorValue.set(undefined);
    this.autosave.update(draft => {
      draft.facilityAnalysisItems = reconcileFacilityAnalysisLinks(draft, this.context.facilities())
        .map(item => item.facilityId === facilityGuid ? { ...item, analysisItemId } : item);
      draft.facilityItemsInitialized = true;
      draft.isAnalysisVisited = false;
    }, { immediate: true, valid: true });
  }

  private returnOriginQueryParams(accountGuid: string, analysisGuid: string, facilityGuid: string): Record<string, string> {
    return {
      [ACCOUNT_ANALYSIS_ORIGIN_QUERY.accountGuid]: accountGuid,
      [ACCOUNT_ANALYSIS_ORIGIN_QUERY.analysisGuid]: analysisGuid,
      [ACCOUNT_ANALYSIS_ORIGIN_QUERY.facilityGuid]: facilityGuid
    };
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof WorkspaceWriteError || error instanceof Error) return error.message;
  return fallback;
}
