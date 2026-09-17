import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { runWorker } from '@platform/web-workers/run-worker';
import { StatusEvaluationState } from './status.models';

interface CalendarizationWorkerResponse {
  readonly calanderizedMeters?: CalanderizedMeter[];
  readonly error?: boolean;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceCalendarizationService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly writableState = signal<StatusEvaluationState>('idle');
  private readonly writableMeters = signal<readonly CalanderizedMeter[]>([]);
  private readonly writableRevision = signal<number | undefined>(undefined);
  private subscription?: Subscription;
  private requestId = 0;

  readonly state = this.writableState.asReadonly();
  readonly calendarizedMeters = this.writableMeters.asReadonly();
  readonly revision = this.writableRevision.asReadonly();
  readonly result = computed(() => ({ state: this.state(), revision: this.revision(), meters: this.calendarizedMeters() }));

  constructor() {
    toObservable(computed(() => ({
      snapshot: this.workspace.snapshot(),
      revision: this.workspace.revision(),
      ready: this.workspace.isReady()
    })))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(input => this.refresh(input.snapshot, input.revision, input.ready));
  }

  private refresh(snapshot: ReturnType<AccountWorkspaceStore['snapshot']>, revision: number, ready: boolean): void {
    this.subscription?.unsubscribe();
    const requestId = ++this.requestId;
    if (!ready || !snapshot) {
      this.writableMeters.set([]);
      this.writableRevision.set(undefined);
      this.writableState.set('idle');
      return;
    }
    if (snapshot.meters.length === 0) {
      this.publish(requestId, snapshot.account.guid, revision, []);
      return;
    }
    const payload = {
      meters: [...snapshot.meters],
      allMeterData: cloneMeterData(snapshot.meterData),
      accountOrFacility: snapshot.account,
      monthDisplayShort: false,
      calanderizationOptions: undefined,
      co2Emissions: [...snapshot.customEmissions],
      customFuels: [...snapshot.customFuels],
      facilities: [...snapshot.facilities],
      assessmentReportVersion: snapshot.account.assessmentReportVersion,
      customGWPs: [...snapshot.customGWPs]
    };
    this.writableState.set('evaluating');
    this.writableRevision.set(undefined);

    if (typeof Worker === 'undefined') {
      try {
        const meters = getCalanderizedMeterData(
          [...snapshot.meters], cloneMeterData(snapshot.meterData), snapshot.account, false, undefined,
          [...snapshot.customEmissions], [...snapshot.customFuels], [...snapshot.facilities],
          snapshot.account.assessmentReportVersion, [...snapshot.customGWPs]
        );
        this.publish(requestId, snapshot.account.guid, revision, meters);
      } catch {
        this.fail(requestId, snapshot.account.guid, revision);
      }
      return;
    }

    const worker = new Worker(new URL('../../platform/web-workers/calanderization.worker', import.meta.url));
    this.subscription = runWorker<CalendarizationWorkerResponse>(worker, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => response.error
          ? this.fail(requestId, snapshot.account.guid, revision)
          : this.publish(requestId, snapshot.account.guid, revision, response.calanderizedMeters ?? []),
        error: () => this.fail(requestId, snapshot.account.guid, revision)
      });
  }

  private publish(requestId: number, accountGuid: string, revision: number, meters: readonly CalanderizedMeter[]): void {
    if (!this.isCurrent(requestId, accountGuid, revision)) return;
    this.writableMeters.set(meters);
    this.writableRevision.set(revision);
    this.writableState.set('ready');
  }

  private fail(requestId: number, accountGuid: string, revision: number): void {
    if (!this.isCurrent(requestId, accountGuid, revision)) return;
    this.writableMeters.set([]);
    this.writableRevision.set(undefined);
    this.writableState.set('error');
  }

  private isCurrent(requestId: number, accountGuid: string, revision: number): boolean {
    return requestId === this.requestId
      && this.workspace.account()?.guid === accountGuid
      && this.workspace.revision() === revision;
  }
}

function cloneMeterData(data: readonly IdbUtilityMeterData[]): IdbUtilityMeterData[] {
  return data.map(reading => ({ ...reading }));
}
