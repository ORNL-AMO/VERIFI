import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildMeterCards, buildMeterGroupResultsView, buildMeterGroupSections, buildMeterUsageFactsFromCalendarizedMeters } from './models';

@Injectable()
export class FacilityMetersWorkspaceService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly status = inject(WorkspaceStatusService);
  private readonly currentUrl = signal(this.router.url);

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly meters = computed(() => [...this.workspace.facilityMeters()]);
  readonly meterData = computed(() => [...this.workspace.facilityMeterData()]);
  readonly meterGroups = computed(() => [...this.workspace.facilityMeterGroups()]);
  readonly meterFindings = computed(() => this.status.items().filter(item => item.entity.kind === 'meter' && item.entity.facilityGuid === this.facility()?.guid));
  readonly calendarizationState = computed<'idle' | 'loading' | 'ready' | 'error'>(() => {
    const state = this.status.state();
    return state === 'evaluating' ? 'loading' : state;
  });
  readonly calendarizedMeters = computed(() => this.status.calendarizedMeters().filter(item => item.meter.facilityId === this.facility()?.guid));
  readonly meterCards = computed(() => buildMeterCards(
    this.meters(),
    this.meterData(),
    this.meterGroups(),
    this.meterFindings(),
    this.facility(),
    this.calendarizedMeters(),
    this.status.state() === 'ready'
  ));
  readonly groupSections = computed(() => buildMeterGroupSections(
    this.meters(),
    this.meterData(),
    this.meterGroups(),
    this.meterFindings(),
    this.status.state() === 'ready'
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

  }

  countReadings(meter: IdbUtilityMeter): number {
    return this.meterData().filter(reading => reading.meterId === meter.guid).length;
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
