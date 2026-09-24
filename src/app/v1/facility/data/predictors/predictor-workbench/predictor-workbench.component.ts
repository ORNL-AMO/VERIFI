import { Component, DestroyRef, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PREDICTOR_WORKBENCH_TABS, PredictorWorkbenchTabId, buildPredictorWorkbenchTabAttention } from '../models';
import { PredictorWorkbenchTabsComponent } from './predictor-workbench-tabs/predictor-workbench-tabs.component';

@Component({
  selector: 'app-predictor-workbench',
  templateUrl: './predictor-workbench.component.html',
  styleUrls: ['./predictor-workbench.component.css'],
  standalone: true,
  imports: [IconComponent, PredictorWorkbenchTabsComponent, RouterLink, RouterOutlet]
})
export class PredictorWorkbenchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeTabState = signal<PredictorWorkbenchTabId>('settings');
  private readonly switcherOpenState = signal(false);

  @ViewChild('predictorSwitcherToggle') private readonly switcherToggle?: ElementRef<HTMLButtonElement>;

  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  private readonly status = inject(WorkspaceStatusService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly workbenchLayout = inject(WorkbenchLayoutService);
  readonly tabs = PREDICTOR_WORKBENCH_TABS;
  readonly activeTab = this.activeTabState.asReadonly();
  readonly switcherOpen = this.switcherOpenState.asReadonly();
  readonly factsExpanded = this.workbenchLayout.factsExpanded;
  readonly tabAttention = computed(() => {
    const predictor = this.workspace.selectedPredictor();
    return buildPredictorWorkbenchTabAttention(predictor ? this.status.predictorFindings(predictor.guid) : []);
  });
  readonly accountPredictorsRoute = computed(() => {
    const account = this.workspace.account();
    return account ? [...this.navigation.accountDataRoute(account.guid), 'predictors'] : undefined;
  });

  constructor() {
    effect(() => {
      const predictor = this.workspace.selectedPredictor();
      const facility = this.workspace.facility();
      if (predictor?.predictorType !== 'Weather' || !facility) return;
      const group = this.workspace.weatherStationGroups().find(item =>
        item.predictors.some(groupPredictor => groupPredictor.guid === predictor.guid));
      if (group) {
        const activeTab = this.activeTab();
        const route = activeTab === 'quality'
          ? this.navigation.facilityWeatherPredictorQualityRoute(facility.guid, group.routeKey, predictor.guid)
          : this.navigation.facilityWeatherPredictorRoute(
            facility.guid, group.routeKey, activeTab === 'settings' ? 'setup' : activeTab
          );
        void this.router.navigate(route);
      }
    });
    this.syncActiveTabFromRoute();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.syncActiveTabFromRoute());
  }

  openPredictors(): void {
    const facility = this.workspace.facility();
    if (facility) void this.router.navigate(this.navigation.facilityDataRoute(facility.guid, 'predictors'));
  }

  openTab(tab: string): void {
    if (!isPredictorTab(tab)) return;
    const facility = this.workspace.facility();
    const predictor = this.workspace.selectedPredictor();
    if (facility && predictor) {
      void this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, predictor.guid, tab));
    }
  }

  switchPredictor(predictorGuid: string): void {
    const facility = this.workspace.facility();
    if (!facility) return;
    this.closeSwitcher();
    void this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, predictorGuid, this.activeTab()));
  }

  toggleSwitcher(): void { this.switcherOpenState.update(open => !open); }
  closeSwitcher(): void { this.switcherOpenState.set(false); }
  toggleFacts(): void { this.workbenchLayout.toggleFacts(); }

  onSwitcherEscape(): void {
    if (!this.switcherOpen()) return;
    this.closeSwitcher();
    this.switcherToggle?.nativeElement.focus();
  }

  private syncActiveTabFromRoute(): void {
    const tab = this.route.firstChild?.snapshot?.data?.['predictorTab'];
    this.activeTabState.set(isPredictorTab(tab) ? tab : 'settings');
  }
}

function isPredictorTab(value: unknown): value is PredictorWorkbenchTabId {
  return value === 'settings' || value === 'readings' || value === 'quality';
}
