import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import {
  DataWorkbenchTab,
  DataWorkbenchTabsComponent
} from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import {
  DataWorkbenchResource,
  DataWorkbenchResourceSwitcherComponent
} from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import type { StatusAttentionSummary } from '@app/v1/status/status.models';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { buildPredictorWorkbenchTabAttention, buildWeatherStationStatusChecks } from '../models';
import { WeatherPredictorWorkbenchContextService } from './weather-predictor-workbench-context.service';

@Component({
  selector: 'app-weather-predictor-workbench',
  templateUrl: './weather-predictor-workbench.component.html',
  styleUrls: ['./weather-predictor-workbench.component.css'],
  standalone: true,
  providers: [WeatherPredictorWorkbenchContextService],
  imports: [
    DataWorkbenchFactsToggleComponent,
    DataWorkbenchResourceSwitcherComponent,
    DataWorkbenchTabsComponent,
    IconComponent,
    RouterLink,
    RouterOutlet
  ]
})
export class WeatherPredictorWorkbenchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeTabState = signal('settings');

  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly factsExpanded = inject(WorkbenchLayoutService).factsExpanded;
  readonly context = inject(WeatherPredictorWorkbenchContextService);
  readonly navigation = inject(WorkspaceNavigationService);
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
  readonly tabs = computed<ReadonlyArray<DataWorkbenchTab>>(() => [
    { id: 'settings', label: 'Setup', icon: 'settings' },
    { id: 'readings', label: 'Readings', icon: 'table' },
    ...this.context.predictors().map(predictor => ({
      id: qualityTabId(predictor.guid),
      label: `${predictor.name || 'Weather predictor'} Quality`,
      icon: 'checklist' as const
    }))
  ]);
  readonly activeTab = computed(() => {
    const activeTab = this.activeTabState();
    if (activeTab !== 'quality') return activeTab;
    const firstPredictor = this.context.predictors()[0];
    return firstPredictor ? qualityTabId(firstPredictor.guid) : 'settings';
  });
  readonly tabAttention = computed(() => {
    const group = this.context.group();
    const findings = group?.statusFindings ?? [];
    const aggregate = buildPredictorWorkbenchTabAttention(findings);
    const attention: Record<string, StatusAttentionSummary | undefined> = {
      settings: aggregate.settings,
      readings: aggregate.readings
    };
    this.context.predictors().forEach(predictor => {
      attention[qualityTabId(predictor.guid)] = buildPredictorWorkbenchTabAttention(
        findings.filter(finding => finding.entity.kind === 'predictor' && finding.entity.guid === predictor.guid)
      ).quality;
    });
    return attention;
  });
  readonly statusChecks = computed(() => {
    const group = this.context.group();
    return group ? buildWeatherStationStatusChecks(group.predictors, group.statusFindings) : [];
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

  switchStandardPredictor(predictorGuid: string): void {
    const facility = this.workspace.facility();
    if (!facility) return;
    const activeTab = this.activeTab();
    const tab = activeTab === 'readings' ? 'readings' : activeTab.startsWith('quality:') ? 'quality' : 'settings';
    void this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, predictorGuid, tab));
  }

  switchWeatherStation(groupKey: string): void {
    const facility = this.workspace.facility();
    const currentGroup = this.context.group();
    if (!facility) return;
    if (groupKey === currentGroup?.routeKey) return;
    const tab = this.activeTab() === 'readings' ? 'readings' : 'setup';
    void this.router.navigate(this.navigation.facilityWeatherPredictorRoute(facility.guid, groupKey, tab));
  }

  switchResource(resourceId: string): void {
    if (resourceId.startsWith('predictor:')) this.switchStandardPredictor(resourceId.slice('predictor:'.length));
    else if (resourceId.startsWith('weather:')) this.switchWeatherStation(resourceId.slice('weather:'.length));
  }

  openTab(tab: string): void {
    const facility = this.workspace.facility();
    const group = this.context.group();
    if (!facility || !group) return;
    const qualityPredictorGuid = qualityPredictorGuidFromTab(tab);
    if (qualityPredictorGuid && group.predictors.some(predictor => predictor.guid === qualityPredictorGuid)) {
      void this.router.navigate(this.navigation.facilityWeatherPredictorQualityRoute(
        facility.guid, group.routeKey, qualityPredictorGuid
      ));
    } else if (tab === 'settings' || tab === 'readings') {
      void this.router.navigate(this.navigation.facilityWeatherPredictorRoute(
        facility.guid, group.routeKey, tab === 'settings' ? 'setup' : tab
      ));
    }
  }

  private syncActiveTabFromRoute(): void {
    let snapshot = this.route.snapshot;
    while (snapshot.firstChild) snapshot = snapshot.firstChild;
    const tab = snapshot.data?.['weatherTab'];
    if (tab === 'quality') {
      const predictorGuid = snapshot.paramMap?.get('predictorGuid');
      this.activeTabState.set(predictorGuid ? qualityTabId(predictorGuid) : 'quality');
    } else {
      this.activeTabState.set(tab === 'readings' ? 'readings' : 'settings');
    }
  }
}

function qualityTabId(predictorGuid: string): string {
  return `quality:${predictorGuid}`;
}

function qualityPredictorGuidFromTab(tab: string): string | undefined {
  return tab.startsWith('quality:') ? tab.slice('quality:'.length) || undefined : undefined;
}
