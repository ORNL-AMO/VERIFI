import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceNavigationService } from '../../../../shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import {
  METER_WORKBENCH_TABS,
  MeterWorkbenchTab,
  MeterWorkbenchTabId,
  meterTabLabel
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
  private readonly routeData = toSignal(this.route.data);

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly activeTab = computed<MeterWorkbenchTabId>(() => {
    const tabId = this.routeData()?.['meterTab'];
    return isMeterWorkbenchTab(tabId) ? tabId : 'settings';
  });
  readonly activeTabLabel = computed(() => meterTabLabel(this.activeTab()));
  readonly activeTabSummary = computed(() =>
    METER_WORKBENCH_TABS.find(tab => tab.id === this.activeTab())?.summary ?? METER_WORKBENCH_TABS[0].summary
  );

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
}

function isMeterWorkbenchTab(value: unknown): value is MeterWorkbenchTabId {
  return value === 'settings'
    || value === 'readings'
    || value === 'monthly'
    || value === 'yearly'
    || value === 'quality';
}
