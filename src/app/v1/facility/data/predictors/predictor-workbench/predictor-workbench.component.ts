import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import {
  DataWorkbenchResource,
  DataWorkbenchResourceSwitcherComponent
} from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PREDICTOR_WORKBENCH_TABS, PredictorWorkbenchTabId, buildPredictorWorkbenchTabAttention } from '../models';
import { PREDICTOR_QUALITY_CONTEXT } from '../predictor-quality-context';
import { PredictorWorkbenchContextService } from './predictor-workbench-context.service';

@Component({
  selector: 'app-predictor-workbench',
  templateUrl: './predictor-workbench.component.html',
  styleUrls: ['./predictor-workbench.component.css'],
  standalone: true,
  providers: [
    PredictorWorkbenchContextService,
    { provide: PREDICTOR_QUALITY_CONTEXT, useExisting: PredictorWorkbenchContextService }
  ],
  imports: [
    DataWorkbenchFactsToggleComponent,
    DataWorkbenchResourceSwitcherComponent,
    DataWorkbenchTabsComponent,
    IconComponent,
    RouterLink,
    RouterOutlet
  ]
})
export class PredictorWorkbenchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeTabState = signal<PredictorWorkbenchTabId>('settings');

  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly context = inject(PredictorWorkbenchContextService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly tabs = PREDICTOR_WORKBENCH_TABS;
  readonly activeTab = this.activeTabState.asReadonly();
  readonly resources = computed<readonly DataWorkbenchResource[]>(() => [
    ...this.workspace.standardPredictorCards().map(card => ({
      id: `predictor:${card.predictor.guid}`,
      label: card.predictor.name,
      icon: card.icon
    })),
    ...this.workspace.weatherStationGroups().map(group => ({
      id: `weather:${group.routeKey}`,
      label: group.stationName,
      icon: 'cloudRain' as const
    }))
  ]);
  readonly tabAttention = computed(() => {
    return buildPredictorWorkbenchTabAttention(this.context.findings());
  });
  readonly accountPredictorsRoute = computed(() => {
    const account = this.workspace.account();
    return account ? [...this.navigation.accountDataRoute(account.guid), 'predictors'] : undefined;
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

  openPredictors(): void {
    const facility = this.workspace.facility();
    if (facility) void this.router.navigate(this.navigation.facilityDataRoute(facility.guid, 'predictors'));
  }

  openTab(tab: string): void {
    if (!isPredictorTab(tab)) return;
    const facility = this.workspace.facility();
    const predictor = this.context.predictor();
    if (facility && predictor) {
      void this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, predictor.guid, tab));
    }
  }

  switchPredictor(predictorGuid: string): void {
    const facility = this.workspace.facility();
    if (!facility) return;
    void this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, predictorGuid, this.activeTab()));
  }

  switchWeatherStation(groupKey: string): void {
    const facility = this.workspace.facility();
    if (!facility) return;
    const tab = this.activeTab() === 'readings' ? 'readings' : 'setup';
    void this.router.navigate(this.navigation.facilityWeatherPredictorRoute(facility.guid, groupKey, tab));
  }

  switchResource(resourceId: string): void {
    if (resourceId.startsWith('predictor:')) this.switchPredictor(resourceId.slice('predictor:'.length));
    else if (resourceId.startsWith('weather:')) this.switchWeatherStation(resourceId.slice('weather:'.length));
  }

  private syncActiveTabFromRoute(): void {
    const tab = this.route.firstChild?.snapshot?.data?.['predictorTab'];
    this.activeTabState.set(isPredictorTab(tab) ? tab : 'settings');
  }
}

function isPredictorTab(value: unknown): value is PredictorWorkbenchTabId {
  return value === 'settings' || value === 'readings' || value === 'quality';
}
