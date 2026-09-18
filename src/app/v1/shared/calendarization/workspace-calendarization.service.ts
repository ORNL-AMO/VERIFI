import { Injectable, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CalanderizedMeter } from '@data/models/calanderization';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { runWorker } from '@platform/web-workers/run-worker';
import {
  Observable,
  catchError,
  concat,
  defer,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  switchMap,
  throwError
} from 'rxjs';
import {
  IDLE_WORKSPACE_CALENDARIZATION,
  WorkspaceCalendarizationBaseResult,
  WorkspaceCalendarizationProjectionRequest,
  WorkspaceCalendarizationProjectionResult
} from './workspace-calendarization.models';
import { projectWorkspaceCalendarization } from './workspace-calendarization-projection';
import {
  BuiltWorkspaceCalendarizationRequest,
  WorkspaceCalendarizationWorkerPayload,
  buildWorkspaceCalendarizationRequest
} from './workspace-calendarization-request';

interface CalendarizationWorkerResponse {
  readonly calanderizedMeters?: CalanderizedMeter[];
  readonly error?: boolean;
}

interface WorkspaceCalendarizationInput {
  readonly ready: boolean;
  readonly request?: BuiltWorkspaceCalendarizationRequest;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceCalendarizationService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly currentInput = computed<WorkspaceCalendarizationInput>(() => {
    const snapshot = this.workspace.snapshot();
    return this.workspace.isReady() && snapshot
      ? { ready: true, request: buildWorkspaceCalendarizationRequest(snapshot) }
      : { ready: false };
  });
  readonly currentInputFingerprint = computed(() => this.currentInput().request?.inputFingerprint);
  private readonly input$ = toObservable(this.currentInput).pipe(
    distinctUntilChanged((first, second) => first.ready === second.ready
      && first.request?.accountGuid === second.request?.accountGuid
      && first.request?.inputFingerprint === second.request?.inputFingerprint)
  );
  private readonly baseResult$ = this.input$.pipe(
    switchMap(input => input.ready && input.request
      ? this.createResult(input.request)
      : of(IDLE_WORKSPACE_CALENDARIZATION)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  calendarizeBase(): Observable<WorkspaceCalendarizationBaseResult> {
    return this.baseResult$;
  }

  project(
    base: WorkspaceCalendarizationBaseResult,
    request: WorkspaceCalendarizationProjectionRequest
  ): WorkspaceCalendarizationProjectionResult {
    const snapshot = this.workspace.snapshot();
    if (!snapshot) {
      return {
        state: 'error', accountGuid: base.accountGuid ?? '', inputFingerprint: base.inputFingerprint ?? '', meters: [],
        error: { code: 'invalid-projection', message: 'The account workspace is not ready.' }
      };
    }
    return projectWorkspaceCalendarization(base, snapshot, request);
  }

  private createResult(request: BuiltWorkspaceCalendarizationRequest): Observable<WorkspaceCalendarizationBaseResult> {
    const evaluating: WorkspaceCalendarizationBaseResult = {
      state: 'evaluating',
      accountGuid: request.accountGuid,
      inputFingerprint: request.inputFingerprint,
      meters: []
    };
    const calculation$ = this.execute(request.payload).pipe(
      map(meters => this.assertCompleteResult(meters, request)),
      map(meters => ({
        state: 'ready' as const,
        accountGuid: request.accountGuid,
        inputFingerprint: request.inputFingerprint,
        meters
      })),
      catchError(() => of({
        state: 'error' as const,
        accountGuid: request.accountGuid,
        inputFingerprint: request.inputFingerprint,
        meters: [],
        error: {
          code: 'calculation-failed' as const,
          message: 'Calendarization could not be completed for the current workspace.'
        }
      }))
    );
    return concat(of(evaluating), calculation$);
  }

  private execute(payload: WorkspaceCalendarizationWorkerPayload): Observable<readonly CalanderizedMeter[]> {
    if (typeof Worker === 'undefined') {
      return defer(() => of(getCalanderizedMeterData(
        payload.meters,
        payload.allMeterData,
        payload.accountOrFacility,
        payload.monthDisplayShort,
        payload.calanderizationOptions,
        payload.co2Emissions,
        payload.customFuels,
        payload.facilities,
        payload.assessmentReportVersion,
        payload.customGWPs
      )));
    }
    const worker = new Worker(new URL('../../../platform/web-workers/calanderization.worker', import.meta.url));
    return runWorker<CalendarizationWorkerResponse>(worker, payload).pipe(
      switchMap(response => response.error
        ? throwError(() => new Error('Calendarization worker reported an error.'))
        : of(response.calanderizedMeters ?? []))
    );
  }

  private assertCompleteResult(
    meters: readonly CalanderizedMeter[],
    request: BuiltWorkspaceCalendarizationRequest
  ): readonly CalanderizedMeter[] {
    const expectedIds = request.payload.meters.map(meter => meter.guid).sort();
    const actualIds = meters.map(item => item.meter.guid).sort();
    if (expectedIds.length !== actualIds.length || expectedIds.some((guid, index) => guid !== actualIds[index])) {
      throw new Error('Calendarization did not return every workspace meter.');
    }
    return meters;
  }
}
