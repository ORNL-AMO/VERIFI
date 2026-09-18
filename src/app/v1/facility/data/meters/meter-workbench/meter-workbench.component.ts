import { Component, DestroyRef, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { resolveMeterDisplaySettings } from '@app/v1/facility/data/meters/models';
import { upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { EnergyUnitOptions } from '@shared/unitOptions';
import {
  MeterWorkbenchTab,
  MeterWorkbenchTabId,
  meterWorkbenchTabsForMeter,
  shouldShowMeterBillInspectionTab,
  shouldShowMeterMonthlyDataTab
} from '@app/v1/facility/data/meters/models';

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
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly meterHandler = inject(MeterCommandHandler);
  private readonly activeTabState = signal<MeterWorkbenchTabId>('settings');
  private readonly meterSwitcherOpenState = signal(false);
  private readonly savingDisplaySettingsState = signal(false);
  private readonly displaySettingsErrorState = signal<string | undefined>(undefined);

  @ViewChild('meterSwitcherToggle') private readonly meterSwitcherToggle?: ElementRef<HTMLButtonElement>;

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly workbenchLayout = inject(WorkbenchLayoutService);
  readonly activeTab = this.activeTabState.asReadonly();
  readonly meterSwitcherOpen = this.meterSwitcherOpenState.asReadonly();
  readonly factsExpanded = this.workbenchLayout.factsExpanded;
  readonly energyUnitOptions = computed(() => EnergyUnitOptions);
  readonly savingDisplaySettings = this.savingDisplaySettingsState.asReadonly();
  readonly displaySettingsError = this.displaySettingsErrorState.asReadonly();
  readonly displaySettings = computed(() => {
    const facility = this.workspace.facility();
    const meter = this.workspace.selectedMeter();
    return facility && meter ? resolveMeterDisplaySettings(meter, facility) : undefined;
  });
  readonly displayEnergyUnitControl = new FormControl(
    this.displaySettings()?.energyUnit ?? '',
    { nonNullable: true }
  );
  readonly canEditDisplaySettings = computed(() => this.workspace.canWrite()
    && !this.workspace.hasPending()
    && !this.savingDisplaySettingsState());
  private readonly syncDisplayEnergyUnitEffect = effect(() => {
    const energyUnit = this.displaySettings()?.energyUnit ?? '';
    const saving = this.savingDisplaySettingsState();
    if (!saving && this.displayEnergyUnitControl.value !== energyUnit) {
      this.displayEnergyUnitControl.setValue(energyUnit, { emitEvent: false });
    }

    if (this.canEditDisplaySettings()) {
      this.displayEnergyUnitControl.enable({ emitEvent: false });
    } else {
      this.displayEnergyUnitControl.disable({ emitEvent: false });
    }
  });
  readonly isLoading = computed(() => this.workspace.calendarizationState() === 'loading');
  readonly showWorkspaceUnavailable = computed(() => !this.workspace.canWrite() && this.activeTabState() !== 'settings');
  readonly showWorkspacePending = computed(() => this.workspace.hasPending() && this.activeTabState() !== 'settings');
  readonly accountMetersRoute = computed(() => {
    const account = this.workspace.account();
    return account ? [...this.navigation.accountDataRoute(account.guid), 'meters'] : undefined;
  });
  private readonly redirectHiddenMonthlyTabEffect = effect(() => {
    const facility = this.workspace.facility();
    const meter = this.workspace.selectedMeter();
    if (facility && meter && this.activeTabState() === 'monthly' && !shouldShowMeterMonthlyDataTab(meter)) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'readings'), { replaceUrl: true });
    }
    if (facility && meter && this.activeTabState() === 'bill-inspection' && !shouldShowMeterBillInspectionTab(meter)) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, 'settings'), { replaceUrl: true, fragment: 'meter-charges' });
    }
  });

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
    return meterWorkbenchTabsForMeter(this.workspace.selectedMeter());
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

  toggleFacts(): void {
    this.workbenchLayout.toggleFacts();
  }

  setDisplayEnergyUnit(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    const meter = this.workspace.selectedMeter();
    const facility = this.workspace.facility();
    if (!meter || !facility || !this.canEditDisplaySettings()) return;
    if (selectedValue === facility.energyUnit) {
      if (meter.displayEnergyUnit === undefined) return;
      const updated = { ...meter };
      delete updated.displayEnergyUnit;
      void this.saveDisplaySettings(updated);
      return;
    }
    if (meter.displayEnergyUnit === selectedValue) return;
    void this.saveDisplaySettings({ ...meter, displayEnergyUnit: selectedValue });
  }

  setDisplayEnergyIsSource(displayEnergyIsSource: boolean): void {
    const meter = this.workspace.selectedMeter();
    const facility = this.workspace.facility();
    if (!meter || !facility || !this.canEditDisplaySettings()) return;
    const nextPreference = displayEnergyIsSource === facility.energyIsSource ? undefined : displayEnergyIsSource;
    if (meter.displayEnergyIsSource === nextPreference) return;
    if (nextPreference === undefined) {
      const updated = { ...meter };
      delete updated.displayEnergyIsSource;
      void this.saveDisplaySettings(updated);
      return;
    }
    void this.saveDisplaySettings({ ...meter, displayEnergyIsSource: nextPreference });
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
    const targetMeter = this.workspace.meters().find(meter => meter.guid === meterGuid);
    let targetTab = this.activeTab();
    if (targetTab === 'monthly' && !shouldShowMeterMonthlyDataTab(targetMeter)) {
      targetTab = 'readings';
    }
    if (targetTab === 'bill-inspection' && !shouldShowMeterBillInspectionTab(targetMeter)) {
      targetTab = 'settings';
    }
    this.closeMeterSwitcher();
    void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meterGuid, targetTab));
  }

  private syncActiveTabFromRoute(): void {
    const tabId = this.route.firstChild?.snapshot?.data?.['meterTab'];
    this.activeTabState.set(isMeterWorkbenchTab(tabId) ? tabId : 'settings');
  }

  private async saveDisplaySettings(updatedMeter: IdbUtilityMeter): Promise<void> {
    const account = this.workspace.account();
    if (!account || !this.canEditDisplaySettings()) return;
    this.savingDisplaySettingsState.set(true);
    this.displaySettingsErrorState.set(undefined);
    try {
      await this.commandBoundary.execute(
        {
          entityKind: 'meter',
          changeKind: 'update',
          entityGuid: updatedMeter.guid,
          label: 'Updating meter display',
          publication: {
            mode: 'patch',
            buildPatch: value => upsertWorkspaceRecords('meters', [value])
          }
        },
        () => this.meterHandler.updateMeter(updatedMeter, account.guid)
      );
    } catch (error) {
      this.displayEnergyUnitControl.setValue(this.displaySettings()?.energyUnit ?? '', { emitEvent: false });
      this.displaySettingsErrorState.set(error instanceof Error
        ? error.message
        : 'The meter display settings could not be saved.');
    } finally {
      this.savingDisplaySettingsState.set(false);
    }
  }
}

function isMeterWorkbenchTab(value: unknown): value is MeterWorkbenchTabId {
  return value === 'settings'
    || value === 'readings'
    || value === 'bill-inspection'
    || value === 'monthly'
    || value === 'monthly-chart'
    || value === 'yearly'
    || value === 'quality';
}
