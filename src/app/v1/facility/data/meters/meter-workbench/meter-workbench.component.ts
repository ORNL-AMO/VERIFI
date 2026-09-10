import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { WorkspaceNavigationService } from '../../../../shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import {
  METER_WORKBENCH_TABS,
  MeterWorkbenchTab,
  MeterWorkbenchTabId
} from '../facility-meters.models';

@Component({
  selector: 'app-meter-workbench',
  templateUrl: './meter-workbench.component.html',
  styleUrls: ['./meter-workbench.component.css'],
  standalone: false
})
export class MeterWorkbenchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeTabState = signal<MeterWorkbenchTabId>('settings');
  private readonly meterSwitcherOpenState = signal(false);

  @ViewChild('meterSwitcherToggle') private readonly meterSwitcherToggle?: ElementRef<HTMLButtonElement>;

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly activeTab = this.activeTabState.asReadonly();
  readonly meterSwitcherOpen = this.meterSwitcherOpenState.asReadonly();
  readonly showWorkspaceUnavailable = computed(() => !this.workspace.canWrite() && this.activeTabState() !== 'settings');
  readonly showWorkspacePending = computed(() => this.workspace.hasPending() && this.activeTabState() !== 'settings');

  constructor() {
    this.syncActiveTabFromRoute();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.syncActiveTabFromRoute());
  }

  openMeters(): void {
    const facility = this.workspace.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityDataRoute(facility.guid, 'meters'));
    }
  }

  get tabs(): ReadonlyArray<MeterWorkbenchTab> {
    return METER_WORKBENCH_TABS;
  }

  openMeter(tab: MeterWorkbenchTabId): void {
    const facility = this.workspace.facility();
    const meter = this.workspace.selectedMeter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, tab));
    }
  }

  toggleMeterSwitcher(): void {
    this.meterSwitcherOpenState.update(open => !open);
  }

  closeMeterSwitcher(): void {
    this.meterSwitcherOpenState.set(false);
  }

  onMeterSwitcherEscape(): void {
    if (!this.meterSwitcherOpen()) {
      return;
    }
    this.closeMeterSwitcher();
    this.meterSwitcherToggle?.nativeElement.focus();
  }

  switchMeter(meterGuid: string): void {
    const facility = this.workspace.facility();
    if (!facility) {
      return;
    }
    this.closeMeterSwitcher();
    void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meterGuid, this.activeTab()));
  }

  private syncActiveTabFromRoute(): void {
    const tabId = this.route.firstChild?.snapshot?.data?.['meterTab'];
    this.activeTabState.set(isMeterWorkbenchTab(tabId) ? tabId : 'settings');
  }
}

function isMeterWorkbenchTab(value: unknown): value is MeterWorkbenchTabId {
  return value === 'settings'
    || value === 'readings'
    || value === 'monthly'
    || value === 'yearly'
    || value === 'quality';
}
