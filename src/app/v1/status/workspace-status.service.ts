import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { evaluateWorkspaceStatus } from './status.evaluator';
import { presentFindings, todoItems } from './status.catalog';
import { StatusEvaluationState, StatusFinding, StatusItem, summarizeFindings } from './status.models';
import { createStatusWarningDismissal, partitionStatusFindings, statusFindingEvidenceSignature } from './status.dismissals';

@Injectable({ providedIn: 'root' })
export class WorkspaceStatusService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly router = inject(Router);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly accountHandler = inject(AccountCommandHandler);
  private readonly destroyRef = inject(DestroyRef);
  private readonly evaluationDate = signal(startOfToday());
  private readonly coverage = toSignal(this.calendarization.calendarizeBase(), {
    initialValue: IDLE_WORKSPACE_CALENDARIZATION
  });
  private dateRefreshTimeout?: ReturnType<typeof setTimeout>;
  private readonly warningActionIdState = signal<string | undefined>(undefined);
  private readonly warningActionErrorState = signal<string | undefined>(undefined);

  private readonly canEvaluate = computed(() => this.workspace.isReady()
    && !!this.workspace.snapshot()
    && this.coverage().state === 'ready'
    && this.coverage().accountGuid === this.workspace.account()?.guid
    && this.coverage().inputFingerprint === this.calendarization.currentInputFingerprint());
  private readonly evaluationResult = computed(() => {
    const snapshot = this.workspace.snapshot();
    if (!snapshot || !this.canEvaluate()) return undefined;
    try {
      return {
        evaluation: evaluateWorkspaceStatus({
          snapshot,
          calendarizedMeters: this.coverage().meters,
          revision: this.workspace.revision(),
          asOfDate: this.evaluationDate()
        })
      };
    } catch (error) {
      return { error };
    }
  });
  readonly state = computed<StatusEvaluationState>(() => {
    if (!this.workspace.isReady() || !this.workspace.snapshot()) return 'idle';
    if (this.coverage().state === 'error') return 'error';
    if (!this.canEvaluate()) return 'evaluating';
    return this.evaluationResult()?.error ? 'error' : 'ready';
  });
  readonly evaluation = computed(() => this.evaluationResult()?.evaluation);
  readonly rawFindings = computed<readonly StatusFinding[]>(() => this.evaluation()?.findings ?? []);
  private readonly findingPartition = computed(() => partitionStatusFindings(
    this.rawFindings(),
    this.workspace.account()?.statusWarningDismissals ?? []
  ));
  readonly findings = computed<readonly StatusFinding[]>(() => this.findingPartition().active);
  readonly discardedFindings = computed<readonly StatusFinding[]>(() => this.findingPartition().discarded);
  readonly items = computed<readonly StatusItem[]>(() => presentFindings(this.findings()));
  readonly discardedItems = computed<readonly StatusItem[]>(() => presentFindings(this.discardedFindings()));
  readonly accountSummary = computed(() => summarizeFindings(this.findings()));
  readonly accountTodos = computed(() => todoItems(this.findings()));
  readonly selectedFacilityFindings = computed(() => {
    const facilityGuid = this.workspace.selectedFacility()?.guid;
    return facilityGuid ? this.findings().filter(finding => finding.entity.facilityGuid === facilityGuid) : [];
  });
  readonly selectedFacilitySummary = computed(() => summarizeFindings(this.selectedFacilityFindings()));
  readonly selectedFacilityTodos = computed(() => todoItems(this.selectedFacilityFindings()));
  readonly accountDiscardedWarnings = computed(() => this.discardedItems());
  readonly selectedFacilityDiscardedWarnings = computed(() => {
    const facilityGuid = this.workspace.selectedFacility()?.guid;
    return facilityGuid
      ? this.discardedItems().filter(item => item.entity.facilityGuid === facilityGuid)
      : [];
  });
  readonly warningActionId = this.warningActionIdState.asReadonly();
  readonly warningActionError = this.warningActionErrorState.asReadonly();
  readonly canManageWarnings = computed(() => this.workspace.canWrite()
    && !this.workspace.hasPending()
    && !this.warningActionIdState());

  constructor() {
    this.scheduleDateRefresh();
    this.destroyRef.onDestroy(() => {
      if (this.dateRefreshTimeout) clearTimeout(this.dateRefreshTimeout);
    });
  }

  findingsForEntity(guid: string): StatusItem[] {
    return presentFindings(this.findings().filter(finding => finding.entity.guid === guid));
  }

  meterFindings(meterGuid: string): StatusItem[] {
    return this.findingsForEntity(meterGuid);
  }

  async discardWarning(item: StatusItem): Promise<boolean> {
    if (item.severity !== 'warning') return false;
    const account = this.workspace.account();
    if (!account || !this.canManageWarnings()) return false;

    const dismissal = createStatusWarningDismissal(item, new Date().toISOString());
    const updatedAccount = {
      ...structuredClone(account),
      statusWarningDismissals: [
        ...(account.statusWarningDismissals ?? []).filter(existing => existing.findingId !== item.id),
        dismissal
      ]
    };
    return this.persistWarningPreference(item.id, 'Discarding status warning', updatedAccount);
  }

  async restoreWarning(item: StatusItem): Promise<boolean> {
    if (item.severity !== 'warning') return false;
    const account = this.workspace.account();
    if (!account || !this.canManageWarnings()) return false;
    const signature = statusFindingEvidenceSignature(item);
    const updatedAccount = {
      ...structuredClone(account),
      statusWarningDismissals: (account.statusWarningDismissals ?? []).filter(existing =>
        existing.findingId !== item.id || existing.evidenceSignature !== signature
      )
    };
    return this.persistWarningPreference(item.id, 'Restoring status warning', updatedAccount);
  }

  navigateTo(item: StatusItem): void {
    switch (item.destination.kind) {
      case 'account-settings':
        void this.router.navigate(['/v1', 'workspace', 'account', item.destination.accountGuid, 'settings', item.destination.detail]);
        break;
      case 'facility-data':
        void this.router.navigate(['/v1', 'workspace', 'facility', item.destination.facilityGuid, 'data', item.destination.detail]);
        break;
      case 'meter-tab':
        void this.router.navigate(['/v1', 'workspace', 'facility', item.destination.facilityGuid, 'data', 'meters', item.destination.meterGuid, item.destination.tab]);
        break;
    }
  }

  private scheduleDateRefresh(): void {
    this.dateRefreshTimeout = scheduleNextDateRefresh(() => {
      this.evaluationDate.set(startOfToday());
      this.scheduleDateRefresh();
    });
  }

  private async persistWarningPreference(
    findingId: string,
    label: string,
    updatedAccount: IdbAccount
  ): Promise<boolean> {
    this.warningActionIdState.set(findingId);
    this.warningActionErrorState.set(undefined);
    try {
      await this.commandBoundary.execute(
        {
          entityKind: 'account',
          changeKind: 'update',
          entityGuid: updatedAccount.guid,
          label,
          notification: { suppressSuccessToast: true },
          publication: { mode: 'patch', buildPatch: value => ({ account: value }) }
        },
        () => this.accountHandler.update(updatedAccount, updatedAccount.guid)
      );
      return true;
    } catch (error) {
      this.warningActionErrorState.set(error instanceof Error
        ? error.message
        : 'The warning preference could not be saved.');
      return false;
    } finally {
      this.warningActionIdState.set(undefined);
    }
  }
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function scheduleNextDateRefresh(callback: () => void): ReturnType<typeof setTimeout> {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return setTimeout(callback, next.getTime() - now.getTime());
}
