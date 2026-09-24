import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import type { StatusAttentionSummary } from '@app/v1/status/status.models';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { buildPredictorWorkbenchTabAttention, buildWeatherStationStatusChecks } from '../models';
import {
  PredictorWorkbenchDisplayTab,
  PredictorWorkbenchTabsComponent
} from '../predictor-workbench/predictor-workbench-tabs/predictor-workbench-tabs.component';

@Component({
  selector: 'app-weather-predictor-workbench',
  templateUrl: './weather-predictor-workbench.component.html',
  styleUrls: ['./weather-predictor-workbench.component.css'],
  standalone: true,
  imports: [IconComponent, PredictorWorkbenchTabsComponent, RouterLink, RouterOutlet]
})
export class WeatherPredictorWorkbenchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeTabState = signal('settings');
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly tabs = computed<ReadonlyArray<PredictorWorkbenchDisplayTab>>(() => [
    { id: 'settings', label: 'Setup', icon: 'settings' },
    { id: 'readings', label: 'Readings', icon: 'table' },
    ...this.workspace.selectedWeatherPredictors().map(predictor => ({
      id: qualityTabId(predictor.guid),
      label: `${predictor.name || 'Weather predictor'} Quality`,
      icon: 'checklist' as const
    }))
  ]);
  readonly activeTab = computed(() => {
    const activeTab = this.activeTabState();
    if (activeTab !== 'quality') return activeTab;
    const firstPredictor = this.workspace.selectedWeatherPredictors()[0];
    return firstPredictor ? qualityTabId(firstPredictor.guid) : 'settings';
  });
  readonly tabAttention = computed(() => {
    const group = this.workspace.selectedWeatherGroup();
    const findings = group?.statusFindings ?? [];
    const aggregate = buildPredictorWorkbenchTabAttention(findings);
    const attention: Record<string, StatusAttentionSummary | undefined> = {
      settings: aggregate.settings,
      readings: aggregate.readings
    };
    this.workspace.selectedWeatherPredictors().forEach(predictor => {
      attention[qualityTabId(predictor.guid)] = buildPredictorWorkbenchTabAttention(
        findings.filter(finding => finding.entity.kind === 'predictor' && finding.entity.guid === predictor.guid)
      ).quality;
    });
    return attention;
  });
  readonly statusChecks = computed(() => {
    const group = this.workspace.selectedWeatherGroup();
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

  openTab(tab: string): void {
    const facility = this.workspace.facility();
    const group = this.workspace.selectedWeatherGroup();
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
