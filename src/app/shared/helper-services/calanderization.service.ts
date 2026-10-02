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
  | (CalendarizationRequestState<'ready'> & { calanderizedMeters: Array<CalanderizedMeter> })
  | (CalendarizationRequestState<'error'> & { message: string });

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

@Injectable({
  providedIn: 'root'
})
export class CalanderizationService implements OnDestroy {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private workspaceSub: Subscription;
  private workerSub?: Subscription;
  private requestId = 0;

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
      this.startCalendarization(snapshot, this.accountWorkspaceStore.revision());
    }
  }

  private startCalendarization(snapshot: AccountWorkspaceSnapshot, workspaceRevision: number): void {
    this.cancelWorker();
    const requestId = this.requestId;
    const accountGuid = snapshot.account.guid;
    const meters: Array<IdbUtilityMeter> = [...snapshot.meters];
    const accountFacilities: Array<IdbFacility> = [...snapshot.facilities];

    this.calanderizedMeters.next([]);
    this.calendarizationState.next({
      status: 'loading',
      accountGuid,
      workspaceRevision,
      requestId,
      workspaceSnapshot: snapshot
    });

    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../platform/web-workers/calanderization.worker', import.meta.url));
      this.workerSub = runWorker<CalendarizationWorkerResult>(worker, {
        meters: meters,
        allMeterData: [...snapshot.meterData],
        accountOrFacility: snapshot.account,
        monthDisplayShort: false,
        calanderizationOptions: undefined,
        co2Emissions: [],
        customFuels: [],
        facilities: accountFacilities,
        assessmentReportVersion: snapshot.account.assessmentReportVersion,
        customGWPs: []
      }).pipe(
        timeout(CALCULATION_WORKER_TIMEOUT_MS)
      ).subscribe({
        next: data => {
          if (!this.isCurrentRequest(requestId, workspaceRevision, snapshot)) return;
          if (data.error || !data.calanderizedMeters) {
            this.publishError(requestId, workspaceRevision, snapshot);
            return;
          }
          this.calanderizedMeters.next(data.calanderizedMeters);
          this.calendarizationState.next({
            status: 'ready',
            accountGuid,
            workspaceRevision,
            requestId,
            workspaceSnapshot: snapshot,
            calanderizedMeters: data.calanderizedMeters
          });
        },
        error: () => this.publishError(requestId, workspaceRevision, snapshot)
      });
    } else {
      try {
        const calanderizedMeters = getCalanderizedMeterData(
          meters,
          [...snapshot.meterData],
          snapshot.account,
          false,
          undefined,
          [],
          [],
          accountFacilities,
          snapshot.account.assessmentReportVersion,
          []
        );
        if (!this.isCurrentRequest(requestId, workspaceRevision, snapshot)) return;
        this.calanderizedMeters.next(calanderizedMeters);
        this.calendarizationState.next({
          status: 'ready',
          accountGuid,
          workspaceRevision,
          requestId,
          workspaceSnapshot: snapshot,
          calanderizedMeters
        });
      } catch {
        this.publishError(requestId, workspaceRevision, snapshot);
      }
    }
  }

  private waitForWorkspaceReplacement(snapshot: AccountWorkspaceSnapshot, workspaceRevision: number): void {
    this.cancelWorker();
    this.calanderizedMeters.next([]);
    this.calendarizationState.next({
      status: 'loading',
      accountGuid: snapshot.account.guid,
      workspaceRevision,
      requestId: this.requestId,
      workspaceSnapshot: snapshot
    });
  }

  private cancelWorker(): void {
    this.requestId++;
    this.workerSub?.unsubscribe();
    this.workerSub = undefined;
  }

  private isCurrentRequest(requestId: number, workspaceRevision: number, snapshot: AccountWorkspaceSnapshot): boolean {
    return requestId === this.requestId
      && workspaceRevision === this.accountWorkspaceStore.revision()
      && this.accountWorkspaceStore.snapshot() === snapshot;
  }

  private publishError(requestId: number, workspaceRevision: number, snapshot: AccountWorkspaceSnapshot): void {
    if (!this.isCurrentRequest(requestId, workspaceRevision, snapshot)) return;
    this.calanderizedMeters.next([]);
    this.calendarizationState.next({
      status: 'error',
      accountGuid: snapshot.account.guid,
      workspaceRevision,
      requestId,
      workspaceSnapshot: snapshot,
      message: 'VERIFI could not finish checking calendarized meter data.'
    });
  }

  getAccountCalanderizedMeters(): Array<CalanderizedMeter> {
    return this.calanderizedMeters.getValue();
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
