import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { computed, Injectable, inject, OnDestroy } from '@angular/core';
import * as _ from 'lodash';
import { CalanderizationFilters, CalanderizedMeter } from '@data/models/calanderization';
import { BehaviorSubject, Subscription } from 'rxjs';
import { getIsEnergyMeter } from '@shared/sharedHelperFunctions';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getAllYearsWithData, getYearsWithFullData } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';
import { timeout } from 'rxjs/operators';

export type CalendarizationState =
  | { status: 'idle' }
  | CalendarizationRequestState<'loading'>
  | CalendarizationReadyState
  | (CalendarizationRequestState<'error'> & { message: string });

export type CalendarizationReadyState = CalendarizationRequestState<'ready'> & {
  calanderizedMeters: Array<CalanderizedMeter>;
};

interface CalendarizationRequestState<TStatus extends 'loading' | 'ready' | 'error'> {
  status: TStatus;
  accountGuid: string;
  workspaceRevision: number;
  requestId: number;
  workspaceSnapshot: AccountWorkspaceSnapshot;
}

interface CalendarizationWorkerResult {
  calanderizedMeters?: Array<CalanderizedMeter>;
  error: boolean;
}

function calendarizationInputs(snapshot: AccountWorkspaceSnapshot) {
  return {
    meters: [...snapshot.meters],
    allMeterData: [...snapshot.meterData],
    accountOrFacility: snapshot.account,
    monthDisplayShort: false,
    calanderizationOptions: undefined,
    co2Emissions: [],
    customFuels: [],
    facilities: [...snapshot.facilities],
    assessmentReportVersion: snapshot.account.assessmentReportVersion,
    customGWPs: []
  };
}

@Injectable({
  providedIn: 'root'
})
export class CalanderizationService implements OnDestroy {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private workspaceSub: Subscription;
  private workerSub?: Subscription;
  private requestId = 0;
  private requestInputs?: ReturnType<typeof calendarizationInputs>;

  calanderizedDataFilters: BehaviorSubject<CalanderizationFilters>;
  displayGraphEnergy: "bar" | "scatter" | null = "bar";
  displayGraphCost: "bar" | "scatter" | null = "bar";
  dataDisplay: "table" | "graph" = 'table';

  //calanderizedMeters in this service should be used for finding date ranges
  //NOT for displaying results for energy use. The units and site/source
  //is not considered in this calanderizedMeters object.
  //when needing energy use, calculate at the place using the results
  calanderizedMeters: BehaviorSubject<Array<CalanderizedMeter>>;
  calendarizationState: BehaviorSubject<CalendarizationState>;

  constructor() {
    this.calanderizedDataFilters = new BehaviorSubject({
      selectedSources: [],
      showAllSources: true,
      selectedDateMax: undefined,
      selectedDateMin: undefined,
      dataDateRange: undefined
    });

    this.calanderizedMeters = new BehaviorSubject([]);
    this.calendarizationState = new BehaviorSubject<CalendarizationState>({ status: 'idle' });

    const workspaceCalculationState = computed(() => ({
      status: this.accountWorkspaceStore.status(),
      snapshot: this.accountWorkspaceStore.snapshot(),
      revision: this.accountWorkspaceStore.revision()
    }), {
      equal: (previous, current) => previous.status === current.status
        && previous.snapshot === current.snapshot
        && previous.revision === current.revision
    });
    this.workspaceSub = toObservable(workspaceCalculationState).subscribe(workspace => {
      if (workspace.status === 'ready' && workspace.snapshot) {
        this.startCalendarization(workspace.snapshot, workspace.revision);
      } else if ((workspace.status === 'loading' || workspace.status === 'switching') && workspace.snapshot) {
        this.waitForWorkspaceReplacement(workspace.snapshot, workspace.revision);
      } else {
        this.cancelWorker();
        this.requestInputs = undefined;
        this.calanderizedMeters.next([]);
        this.calendarizationState.next({ status: 'idle' });
      }
    });
  }

  ngOnDestroy(): void {
    this.workspaceSub.unsubscribe();
    this.cancelWorker();
  }

  recalculateCurrentWorkspace(): void {
    const snapshot = this.accountWorkspaceStore.snapshot();
    if (snapshot && this.accountWorkspaceStore.status() === 'ready') {
      this.startCalendarization(snapshot, this.accountWorkspaceStore.revision(), true);
    }
  }

  private startCalendarization(snapshot: AccountWorkspaceSnapshot, workspaceRevision: number, force = false): void {
    const inputs = calendarizationInputs(snapshot);
    const state = this.calendarizationState.value;
    if (!force && state.status !== 'idle' && (state.status !== 'loading' || (this.workerSub && !this.workerSub.closed))
      && this.requestInputs && _.isEqual(inputs, this.requestInputs)) {
      // Analysis/report commits change the snapshot without changing meter inputs.
      // Keep the ready result or running job, but associate it with the latest commit.
      this.calendarizationState.next({ ...state, workspaceSnapshot: snapshot, workspaceRevision });
      return;
    }
    this.cancelWorker();
    const requestId = this.requestId;
    this.requestInputs = structuredClone(inputs);
    this.calanderizedMeters.next([]);
    this.calendarizationState.next({
      status: 'loading', accountGuid: snapshot.account.guid, workspaceRevision,
      requestId, workspaceSnapshot: snapshot
    });

    try {
      if (typeof Worker !== 'undefined') {
        const worker = new Worker(new URL('../../platform/web-workers/calanderization.worker', import.meta.url));
        this.workerSub = runWorker<CalendarizationWorkerResult>(worker, inputs).pipe(
          timeout(CALCULATION_WORKER_TIMEOUT_MS)
        ).subscribe({
          next: data => {
            if (data.error || !data.calanderizedMeters) {
              this.publishError(requestId);
            } else {
              this.publishResult(requestId, data.calanderizedMeters);
            }
          },
          error: () => this.publishError(requestId)
        });
      } else {
        // The synchronous calculation may normalize inputs; do not mutate the workspace or comparison snapshot.
        const request = structuredClone(inputs);
        this.publishResult(requestId, getCalanderizedMeterData(
          request.meters, request.allMeterData, request.accountOrFacility,
          request.monthDisplayShort, request.calanderizationOptions, request.co2Emissions,
          request.customFuels, request.facilities, request.assessmentReportVersion, request.customGWPs
        ));
      }
    } catch {
      this.publishError(requestId);
    }
  }

  private waitForWorkspaceReplacement(snapshot: AccountWorkspaceSnapshot, workspaceRevision: number): void {
    this.cancelWorker();
    this.requestInputs = undefined;
    this.calanderizedMeters.next([]);
    this.calendarizationState.next({
      status: 'loading', accountGuid: snapshot.account.guid, workspaceRevision,
      requestId: this.requestId, workspaceSnapshot: snapshot
    });
  }

  private cancelWorker(): void {
    this.requestId++;
    this.workerSub?.unsubscribe();
    this.workerSub = undefined;
  }

  private currentRequestContext(requestId: number): { snapshot: AccountWorkspaceSnapshot; revision: number } | undefined {
    const snapshot = this.accountWorkspaceStore.snapshot();
    if (requestId !== this.requestId || this.accountWorkspaceStore.status() !== 'ready' || !snapshot
      || !this.requestInputs || !_.isEqual(calendarizationInputs(snapshot), this.requestInputs)) {
      return undefined;
    }
    return { snapshot, revision: this.accountWorkspaceStore.revision() };
  }

  private publishResult(requestId: number, meters: Array<CalanderizedMeter>): void {
    const context = this.currentRequestContext(requestId);
    if (!context) return;
    this.calanderizedMeters.next(meters);
    this.calendarizationState.next({
      status: 'ready', accountGuid: context.snapshot.account.guid, workspaceRevision: context.revision,
      requestId, workspaceSnapshot: context.snapshot, calanderizedMeters: meters
    });
  }

  private publishError(requestId: number): void {
    const context = this.currentRequestContext(requestId);
    if (!context) return;
    this.calanderizedMeters.next([]);
    this.calendarizationState.next({
      status: 'error', accountGuid: context.snapshot.account.guid, workspaceRevision: context.revision,
      requestId, workspaceSnapshot: context.snapshot,
      message: 'VERIFI could not finish checking calendarized meter data.'
    });
  }

  getAccountCalanderizedMeters(): Array<CalanderizedMeter> {
    return this.calanderizedMeters.getValue();
  }

  isReadyForCurrentWorkspace(
    state: CalendarizationState = this.calendarizationState.value
  ): state is CalendarizationReadyState {
    const snapshot = this.accountWorkspaceStore.snapshot();
    return state.status === 'ready'
      && !!snapshot
      && state.accountGuid === snapshot.account.guid
      && !!this.currentRequestContext(state.requestId);
  }

  getReadyCalanderizedMetersByFacilityID(facilityID: string): Array<CalanderizedMeter> | undefined {
    const state = this.calendarizationState.value;
    if (!this.isReadyForCurrentWorkspace(state)) return undefined;
    return state.calanderizedMeters.filter(cMeter => cMeter.meter.facilityId === facilityID);
  }

  getCalanderizedMetersByFacilityID(facilityID: string): Array<CalanderizedMeter> {
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters.getValue();
    let facilityCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => cMeter.meter.facilityId == facilityID);
    return facilityCalanderizedMeters;
  }

  getCalanderizedMetersByGroupId(groupId: string): Array<CalanderizedMeter> {
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters.getValue();
    let filteredCalanderizedMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => cMeter.meter.groupId == groupId);
    return filteredCalanderizedMeters;
  }

  getCalanderizedMeterByMeterId(meterId: string): CalanderizedMeter {
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters.getValue();
    let calanderizedMeter: CalanderizedMeter = calanderizedMeters.find(cMeter => cMeter.meter.guid == meterId);
    return calanderizedMeter;
  }


  getYearOptions(meterCategory: 'water' | 'energy' | 'all', onlyFullYears: boolean, facilityId?: string): Array<number> {
    let meters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
    let accountFacilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    if (facilityId) {
      meters = meters.filter(meter => {
        return meter.facilityId == facilityId
      });
      accountFacilities = accountFacilities.filter(fac => fac.guid == facilityId);
    }
    let categoryMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return this.isCategoryMeter(meter, meterCategory) });
    let categoryMeterIds: Array<string> = categoryMeters.map(meter => { return meter.guid });
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizedMeters.getValue();
    let filteredCalanderizedMeterData: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
      return categoryMeterIds.includes(cMeter.meter.guid)
    });
    if (facilityId) {
      filteredCalanderizedMeterData = filteredCalanderizedMeterData.filter(cMeter => cMeter.meter.facilityId == facilityId);
    }
    let yearsWithFullData: Array<number> = new Array();
    accountFacilities.forEach(facility => {
      if (onlyFullYears) {
        let facilityYearsWithData: Array<number> = getYearsWithFullData(filteredCalanderizedMeterData, facility);
        yearsWithFullData = yearsWithFullData.concat(facilityYearsWithData);
      } else {
        let facilityYearsWithData: Array<number> = getAllYearsWithData(filteredCalanderizedMeterData, facility);
        yearsWithFullData = yearsWithFullData.concat(facilityYearsWithData);
      }
    });
    yearsWithFullData = _.orderBy(yearsWithFullData, (year) => { return year }, 'asc');
    return _.uniq(yearsWithFullData);
  }

  checkReportYearSelection(meterCategory: 'water' | 'energy' | 'all', reportYear: number, onlyFullYears: boolean, facilityId?: string): boolean {
    let yearOptions: Array<number> = this.getYearOptions(meterCategory, onlyFullYears, facilityId);
    return !yearOptions.includes(reportYear);
  }

  isCategoryMeter(meter: IdbUtilityMeter, meterCategory: 'water' | 'energy' | 'all'): boolean {
    if (meterCategory == 'water') {
      if (meter.source == 'Water Intake') {
        return true;
      }
      return false;
    } else if (meterCategory == 'energy') {
      return getIsEnergyMeter(meter.source);
    } else if (meterCategory == 'all') {
      return true;
    }
  }
}

//CalanderizationSummaryItem used in modal to show calanderization method
export interface CalendarizationSummaryItem {
  calanderizedMonth: Date,
  monthReadingSummaries: Array<{
    readDate: Date,
    daysInBill: number,
    energyUsePerDay: number,
    daysApplied: number,
    totalEnergyFromBill: number
  }>
  totalEnergyUse: number
}
