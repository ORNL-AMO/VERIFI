import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import {
  METER_GROUP_WORKBENCH_TABS,
  MeterGroupWorkbenchTab,
  MeterGroupWorkbenchTabId,
  formatMeterGroupNumber,
  isMeterGroupWorkbenchTab
} from '@app/v1/facility/data/meters/models';

@Component({
  selector: 'app-meter-group-workbench',
  templateUrl: './meter-group-workbench.component.html',
  styleUrls: ['./meter-group-workbench.component.css'],
  standalone: false
})
export class MeterGroupWorkbenchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly activeTabState = signal<MeterGroupWorkbenchTabId>('monthly-table');
  private readonly groupSwitcherOpenState = signal(false);
  private readonly savingEnergySource = signal(false);
  readonly actionError = signal<string | undefined>(undefined);

  @ViewChild('groupSwitcherToggle') private readonly groupSwitcherToggle?: ElementRef<HTMLButtonElement>;

  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly activeTab = this.activeTabState.asReadonly();
  readonly groupSwitcherOpen = this.groupSwitcherOpenState.asReadonly();
  readonly results = this.workspace.selectedMeterGroupResults;
  readonly selectedGroup = this.workspace.selectedMeterGroupForWorkbench;
  readonly groupOptions = computed(() => [...this.workspace.meterGroups()].sort((first, second) => first.name.localeCompare(second.name)));
  readonly isLoading = computed(() => this.workspace.calendarizationState() === 'loading');
  readonly hasError = computed(() => this.workspace.calendarizationState() === 'error');
  readonly canSetEnergySource = computed(() =>
    this.workspace.canWrite()
    && !this.workspace.hasPending()
    && !this.savingEnergySource()
    && this.selectedGroup()?.groupType === 'Energy'
  );
  readonly showWorkspaceUnavailable = computed(() => !this.workspace.canWrite());
  readonly showWorkspacePending = computed(() => this.workspace.hasPending());
  readonly hasNoGroupData = computed(() => !this.isLoading() && !this.hasError() && this.results().monthlyRows.length === 0);
  readonly accountMetersRoute = computed(() => {
    const account = this.workspace.account();
    return account ? [...this.navigation.accountDataRoute(account.guid), 'meters'] : undefined;
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

  get tabs(): ReadonlyArray<MeterGroupWorkbenchTab> {
    return METER_GROUP_WORKBENCH_TABS;
  }

  openGrouping(): void {
    const facility = this.workspace.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityDataRoute(facility.guid, 'meter-grouping'));
    }
  }

  openGroupTab(tab: MeterGroupWorkbenchTabId): void {
    const facility = this.workspace.facility();
    const group = this.selectedGroup();
    if (facility && group) {
      void this.router.navigate(this.navigation.facilityMeterGroupRoute(facility.guid, group.guid, tab));
    }
  }

  toggleGroupSwitcher(): void {
    this.groupSwitcherOpenState.update(open => !open);
  }

  closeGroupSwitcher(): void {
    this.groupSwitcherOpenState.set(false);
  }

  onGroupSwitcherEscape(): void {
    if (!this.groupSwitcherOpen()) {
      return;
    }
    this.closeGroupSwitcher();
    this.groupSwitcherToggle?.nativeElement.focus();
  }

  switchGroup(groupGuid: string): void {
    const facility = this.workspace.facility();
    if (!facility) {
      return;
    }
    this.closeGroupSwitcher();
    void this.router.navigate(this.navigation.facilityMeterGroupRoute(facility.guid, groupGuid, this.activeTab()));
  }

  async setFacilityEnergyIsSource(energyIsSource: boolean): Promise<void> {
    const facility = this.workspace.facility();
    if (!facility || facility.energyIsSource === energyIsSource || !this.canSetEnergySource()) {
      return;
    }
    this.savingEnergySource.set(true);
    this.actionError.set(undefined);
    try {
      const updatedFacility = { ...facility, energyIsSource };
      const accountGuid = this.workspace.account()?.guid;
      await this.commandBoundary.execute(
        {
          entityKind: 'facility',
          changeKind: 'update',
          entityGuid: updatedFacility.guid,
          label: 'Update Facility Energy Source',
          publication: {
            mode: 'patch',
            buildPatch: value => ({ collections: [{ collection: 'facilities', upsert: [value] }] })
          }
        },
        () => this.facilityHandler.update(updatedFacility, accountGuid)
      );
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'The facility energy setting could not be saved.');
    } finally {
      this.savingEnergySource.set(false);
    }
  }

  formatNumber(value: number, currency = false): string {
    return formatMeterGroupNumber(value, currency);
  }

  private syncActiveTabFromRoute(): void {
    const tabId = this.route.firstChild?.snapshot?.data?.['meterGroupTab'];
    this.activeTabState.set(isMeterGroupWorkbenchTab(tabId) ? tabId : 'monthly-table');
  }
}
