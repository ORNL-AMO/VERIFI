import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, combineLatest, filter } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccount } from '@data/models/idbModels/account';
import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { runWorker } from '@platform/web-workers/run-worker';
import { buildMeterCards, buildMeterGroupResultsView, buildMeterGroupSections, buildMeterUsageFactsFromCalendarizedMeters } from './facility-meters.models';

interface CalendarizationWorkerResponse {
  readonly calanderizedMeters?: CalanderizedMeter[];
  readonly error?: boolean;
}

@Injectable()
export class FacilityMetersWorkspaceService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly statusCheckService = inject(AccountStatusCheckService);
  private readonly currentUrl = signal(this.router.url);
  private readonly facilityStatusCheck = toSignal(this.statusCheckService.selectedFacilityStatusCheck$, { initialValue: undefined });
  private calendarizationSubscription: Subscription | undefined;
  private calendarizationRequestId = 0;

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly meters = computed(() => [...this.workspace.facilityMeters()]);
  readonly meterData = computed(() => [...this.workspace.facilityMeterData()]);
  readonly meterGroups = computed(() => [...this.workspace.facilityMeterGroups()]);
  readonly meterStatusChecks = computed(() => this.facilityStatusCheck()?.metersStatusChecks ?? []);
  readonly calendarizationState = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly calendarizedMeters = signal<readonly CalanderizedMeter[]>([]);
  readonly meterCards = computed(() => buildMeterCards(
    this.meters(),
    this.meterData(),
    this.meterGroups(),
    this.meterStatusChecks(),
    this.facility(),
    this.calendarizedMeters()
  ));
  readonly groupSections = computed(() => buildMeterGroupSections(
    this.meters(),
    this.meterData(),
    this.meterGroups(),
    this.meterStatusChecks()
  ));
  readonly selectedMeterGuid = computed(() => parseSelectedMeterGuid(this.currentUrl()));
  readonly selectedMeterGroupGuid = computed(() => parseSelectedMeterGroupGuid(this.currentUrl()));
  readonly selectedMeter = computed(() => {
    const selectedGuid = this.selectedMeterGuid();
    return selectedGuid ? this.meters().find(meter => meter.guid === selectedGuid) : undefined;
  });
  readonly selectedMeterGroupForWorkbench = computed(() => {
    const selectedGuid = this.selectedMeterGroupGuid();
    return selectedGuid ? this.meterGroups().find(group => group.guid === selectedGuid) : undefined;
  });
  readonly selectedMeterData = computed(() => {
    const selectedGuid = this.selectedMeterGuid();
    return selectedGuid ? this.meterData().filter(reading => reading.meterId === selectedGuid) : [];
  });
  readonly selectedMeterCard = computed(() => {
    const selectedGuid = this.selectedMeterGuid();
    return selectedGuid ? this.meterCards().find(card => card.meter.guid === selectedGuid) : undefined;
  });
  readonly hasMeterRoute = computed(() => !!this.selectedMeterGuid());
  readonly hasMeterGroupRoute = computed(() => !!this.selectedMeterGroupGuid());
  readonly selectedMeterGroup = computed(() => {
    const meter = this.selectedMeter();
    return meter ? this.meterGroups().find(group => group.guid === meter.groupId) : undefined;
  });
  readonly selectedMeterGroupResults = computed(() => buildMeterGroupResultsView(
    this.selectedMeterGroupForWorkbench(),
    this.facility(),
    this.groupSections(),
    this.calendarizedMeters()
  ));
  readonly selectedMeterUsageFacts = computed(() => {
    const selectedGuid = this.selectedMeterGuid();
    const selectedCalendarizedMeters = selectedGuid
      ? this.calendarizedMeters().filter(calendarizedMeter => calendarizedMeter.meter.guid === selectedGuid)
      : [];
    return buildMeterUsageFactsFromCalendarizedMeters(selectedCalendarizedMeters, this.facility());
  });
  readonly selectedMeterReadingCount = computed(() => {
    const meter = this.selectedMeter();
    return meter ? this.selectedMeterData().length : 0;
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => this.currentUrl.set(event.urlAfterRedirects));

    combineLatest([
      toObservable(this.account),
      toObservable(this.facility),
      toObservable(this.meters),
      toObservable(this.meterData),
      toObservable(this.currentUrl)
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([account, facility, meters, meterData, url]) => {
        this.refreshCalendarizedMeters(account, facility, meters, meterData, url);
      });
  }

  countReadings(meter: IdbUtilityMeter): number {
    return this.meterData().filter(reading => reading.meterId === meter.guid).length;
  }

  private refreshCalendarizedMeters(
    account: IdbAccount | undefined,
    facility: IdbFacility | undefined,
    meters: readonly IdbUtilityMeter[],
    meterData: readonly IdbUtilityMeterData[],
    url: string
  ): void {
    this.calendarizationSubscription?.unsubscribe();
    const requestId = ++this.calendarizationRequestId;
    if (!shouldCalendarizeForUrl(url)) {
      this.calendarizedMeters.set([]);
      this.calendarizationState.set('idle');
      return;
    }
    if (!account || !facility) {
      this.calendarizedMeters.set([]);
      this.calendarizationState.set('idle');
      return;
    }
    if (meters.length === 0) {
      this.calendarizedMeters.set([]);
      this.calendarizationState.set('ready');
      return;
    }

    const allMeterData = cloneMeterData(meterData);
    const payload = {
      meters: [...meters],
      allMeterData,
      accountOrFacility: facility,
      monthDisplayShort: false,
      calanderizationOptions: undefined,
      co2Emissions: [],
      customFuels: [],
      facilities: [facility],
      assessmentReportVersion: account.assessmentReportVersion,
      customGWPs: []
    };
    this.calendarizationState.set('loading');

    if (typeof Worker === 'undefined') {
      try {
        this.calendarizedMeters.set(getCalanderizedMeterData(
          [...meters],
          cloneMeterData(meterData),
          facility,
          false,
          undefined,
          [],
          [],
          [facility],
          account.assessmentReportVersion,
          []
        ));
        this.calendarizationState.set('ready');
      } catch {
        this.calendarizedMeters.set([]);
        this.calendarizationState.set('error');
      }
      return;
    }

    const worker = new Worker(new URL('../../../../platform/web-workers/calanderization.worker', import.meta.url));
    this.calendarizationSubscription = runWorker<CalendarizationWorkerResponse>(worker, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (requestId !== this.calendarizationRequestId) {
            return;
          }
          if (response.error) {
            this.calendarizedMeters.set([]);
            this.calendarizationState.set('error');
            return;
          }
          this.calendarizedMeters.set(response.calanderizedMeters ?? []);
          this.calendarizationState.set('ready');
        },
        error: () => {
          if (requestId === this.calendarizationRequestId) {
            this.calendarizedMeters.set([]);
            this.calendarizationState.set('error');
          }
        }
      });
  }
}

function parseSelectedMeterGuid(url: string): string | undefined {
  const parts = url.split(/[?#]/, 1)[0].split('/').filter(Boolean);
  const metersIndex = parts.findIndex((part, index) => part === 'meters' && parts[index - 1] === 'data');
  const meterGuid = metersIndex >= 0 ? parts[metersIndex + 1] : undefined;
  return meterGuid ? decodeURIComponent(meterGuid) : undefined;
}

function parseSelectedMeterGroupGuid(url: string): string | undefined {
  const parts = url.split(/[?#]/, 1)[0].split('/').filter(Boolean);
  const groupingIndex = parts.findIndex((part, index) => part === 'meter-grouping' && parts[index - 1] === 'data');
  const groupGuid = groupingIndex >= 0 ? parts[groupingIndex + 1] : undefined;
  return groupGuid ? decodeURIComponent(groupGuid) : undefined;
}

function shouldCalendarizeForUrl(url: string): boolean {
  const parts = url.split(/[?#]/, 1)[0].split('/').filter(Boolean);
  const dataIndex = parts.indexOf('data');
  if (dataIndex < 0) {
    return false;
  }
  const dataChild = parts[dataIndex + 1];
  if (dataChild === 'meters') {
    return true;
  }
  return dataChild === 'meter-grouping' && !!parts[dataIndex + 2];
}

function cloneMeterData(meterData: readonly IdbUtilityMeterData[]): IdbUtilityMeterData[] {
  return meterData.map(reading => ({ ...reading }));
}
