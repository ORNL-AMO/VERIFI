import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { buildMeterGroupSections } from './facility-meters.models';

@Injectable()
export class FacilityMetersWorkspaceService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUrl = signal(this.router.url);

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly meters = computed(() => [...this.workspace.facilityMeters()]);
  readonly meterData = computed(() => [...this.workspace.facilityMeterData()]);
  readonly meterGroups = computed(() => [...this.workspace.facilityMeterGroups()]);
  readonly groupSections = computed(() => buildMeterGroupSections(
    this.meters(),
    this.meterData(),
    this.meterGroups()
  ));
  readonly selectedMeterGuid = computed(() => parseSelectedMeterGuid(this.currentUrl()));
  readonly selectedMeter = computed(() => {
    const selectedGuid = this.selectedMeterGuid();
    return selectedGuid ? this.meters().find(meter => meter.guid === selectedGuid) : undefined;
  });
  readonly hasMeterRoute = computed(() => !!this.selectedMeterGuid());
  readonly selectedMeterGroup = computed(() => {
    const meter = this.selectedMeter();
    return meter ? this.meterGroups().find(group => group.guid === meter.groupId) : undefined;
  });
  readonly selectedMeterReadingCount = computed(() => {
    const meter = this.selectedMeter();
    return meter ? this.countReadings(meter) : 0;
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
