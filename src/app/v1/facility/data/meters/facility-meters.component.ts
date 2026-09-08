import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { WorkspaceNavigationService } from '../../../shell/workspace-navigation.service';
import {
  METER_WORKBENCH_TABS,
  MeterWorkbenchTabId,
  buildMeterGroupSections,
  meterTabLabel
} from './facility-meters.models';

@Component({
  selector: 'app-facility-meters',
  templateUrl: './facility-meters.component.html',
  styleUrls: ['./facility-meters.component.css'],
  standalone: false
})
export class FacilityMetersComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly routeParamMap = toSignal(this.route.paramMap);
  private readonly parentParamMap = toSignal(this.route.parent?.paramMap ?? this.route.paramMap);
  private readonly routeData = toSignal(this.route.data);

  readonly navigation = inject(WorkspaceNavigationService);
  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly meters = computed(() => [...this.workspace.facilityMeters()]);
  readonly meterData = computed(() => [...this.workspace.facilityMeterData()]);
  readonly meterGroups = computed(() => [...this.workspace.facilityMeterGroups()]);
  readonly tabs = METER_WORKBENCH_TABS;
  readonly selectedMeterGuid = computed(() =>
    this.routeParamMap()?.get('meterGuid') || this.parentParamMap()?.get('meterGuid') || undefined
  );
  readonly activeTab = computed<MeterWorkbenchTabId>(() => {
    const tabId = this.routeData()?.['meterTab'];
    return isMeterWorkbenchTab(tabId) ? tabId : 'settings';
  });
  readonly selectedMeter = computed(() => {
    const selectedGuid = this.selectedMeterGuid();
    return selectedGuid ? this.meters().find(meter => meter.guid === selectedGuid) : undefined;
  });
  readonly selectedMeterGroup = computed(() => {
    const meter = this.selectedMeter();
    return meter ? this.meterGroups().find(group => group.guid === meter.groupId) : undefined;
  });
  readonly selectedMeterReadingCount = computed(() => {
    const meter = this.selectedMeter();
    return meter ? this.countReadings(meter) : 0;
  });
  readonly groupSections = computed(() => buildMeterGroupSections(
    this.meters(),
    this.meterData(),
    this.meterGroups()
  ));
  readonly hasMeterRoute = computed(() => !!this.selectedMeterGuid());
  readonly activeTabLabel = computed(() => meterTabLabel(this.activeTab()));
  readonly activeTabSummary = computed(() =>
    this.tabs.find(tab => tab.id === this.activeTab())?.summary ?? this.tabs[0].summary
  );

  countReadings(meter: IdbUtilityMeter): number {
    return this.meterData().filter(reading => reading.meterId === meter.guid).length;
  }

  openMeters(): void {
    const facility = this.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityDataRoute(facility.guid, 'meters'));
    }
  }

  openMeter(meterGuid: string, tab: MeterWorkbenchTabId = 'settings'): void {
    const facility = this.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meterGuid, tab));
    }
  }
}

function isMeterWorkbenchTab(value: unknown): value is MeterWorkbenchTabId {
  return value === 'settings'
    || value === 'readings'
    || value === 'monthly'
    || value === 'yearly'
    || value === 'quality';
}
