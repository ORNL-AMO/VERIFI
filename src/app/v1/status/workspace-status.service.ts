import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IDLE_WORKSPACE_CALENDARIZATION } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { evaluateWorkspaceStatus } from './status.evaluator';
import { presentFindings, todoItems } from './status.catalog';
import { StatusEvaluationState, StatusFinding, StatusItem, summarizeFindings } from './status.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceStatusService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly evaluationDate = signal(startOfToday());
  private readonly coverage = toSignal(this.calendarization.calendarizeBase(), {
    initialValue: IDLE_WORKSPACE_CALENDARIZATION
  });
  private dateRefreshTimeout?: ReturnType<typeof setTimeout>;

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
  readonly findings = computed<readonly StatusFinding[]>(() => this.evaluation()?.findings ?? []);
  readonly items = computed<readonly StatusItem[]>(() => presentFindings(this.findings()));
  readonly accountSummary = computed(() => summarizeFindings(this.findings()));
  readonly accountTodos = computed(() => todoItems(this.findings()));
  readonly selectedFacilityFindings = computed(() => {
    const facilityGuid = this.workspace.selectedFacility()?.guid;
    return facilityGuid ? this.findings().filter(finding => finding.entity.facilityGuid === facilityGuid) : [];
  });
  readonly selectedFacilitySummary = computed(() => summarizeFindings(this.selectedFacilityFindings()));
  readonly selectedFacilityTodos = computed(() => todoItems(this.selectedFacilityFindings()));

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
